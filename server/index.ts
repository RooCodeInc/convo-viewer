import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import net from 'net';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Uncommon default port, with failover range
const DEFAULT_PORT = 41839;
const MAX_PORT_ATTEMPTS = 10;
const PORT_FILE = path.join(__dirname, '..', '.server-port');

/**
 * Check if a port is available
 */
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '127.0.0.1');
  });
}

/**
 * Find an available port starting from the default
 */
async function findAvailablePort(startPort: number): Promise<number> {
  for (let attempt = 0; attempt < MAX_PORT_ATTEMPTS; attempt++) {
    const port = startPort + attempt;
    if (await isPortAvailable(port)) {
      return port;
    }
    console.log(`Port ${port} is in use, trying next...`);
  }
  throw new Error(`Could not find an available port after ${MAX_PORT_ATTEMPTS} attempts starting from ${startPort}`);
}

/**
 * Write the server port to a file for the Vite dev server to read
 */
async function writePortFile(port: number): Promise<void> {
  await fs.writeFile(PORT_FILE, port.toString(), 'utf-8');
}

/**
 * Clean up the port file on exit
 */
async function cleanupPortFile(): Promise<void> {
  try {
    await fs.unlink(PORT_FILE);
  } catch {
    // Ignore if file doesn't exist
  }
}

const app = express();
app.use(cors());
app.use(express.json());

const homeDir = os.homedir();
const TASK_PATHS = {
  nightly: path.join(homeDir, 'Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-code-nightly/tasks'),
  production: path.join(homeDir, 'Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/tasks')
};

interface TaskInfo {
  id: string;
  timestamp: number;
  firstMessage: string;
}

app.get('/api/tasks/:source', async (req, res) => {
  const source = req.params.source as 'nightly' | 'production';
  const tasksPath = TASK_PATHS[source];
  
  if (!tasksPath) {
    return res.status(400).json({ error: 'Invalid source' });
  }

  try {
    const dirs = await fs.readdir(tasksPath, { withFileTypes: true });
    const tasks: TaskInfo[] = [];

    for (const dir of dirs) {
      if (!dir.isDirectory()) continue;
      
      const conversationPath = path.join(tasksPath, dir.name, 'api_conversation_history.json');
      
      try {
        const stat = await fs.stat(conversationPath);
        const content = await fs.readFile(conversationPath, 'utf-8');
        const conversation = JSON.parse(content);
        
        let firstMessage = '';
        if (conversation.length > 0 && conversation[0].content) {
          for (const block of conversation[0].content) {
            if (block.type === 'text' && block.text) {
              const taskMatch = block.text.match(/<task>([\s\S]*?)<\/task>/);
              if (taskMatch) {
                firstMessage = taskMatch[1].trim().slice(0, 200);
              } else if (!block.text.includes('<environment_details>')) {
                firstMessage = block.text.slice(0, 200);
              }
              if (firstMessage) break;
            }
          }
        }
        
        tasks.push({
          id: dir.name,
          timestamp: stat.mtimeMs,
          firstMessage: firstMessage || 'No message preview'
        });
      } catch {
        // Skip if conversation file doesn't exist or is invalid
      }
    }

    tasks.sort((a, b) => b.timestamp - a.timestamp);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read tasks' });
  }
});

app.get('/api/task/:source/:id', async (req, res) => {
  const { source, id } = req.params;
  const tasksPath = TASK_PATHS[source as 'nightly' | 'production'];
  
  if (!tasksPath) {
    return res.status(400).json({ error: 'Invalid source', source });
  }

  const conversationPath = path.join(tasksPath, id, 'api_conversation_history.json');
  
  try {
    const content = await fs.readFile(conversationPath, 'utf-8');
    const conversation = JSON.parse(content);
    res.json(conversation);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    console.error(`Failed to read conversation: ${conversationPath}`, err.message);
    if (err.code === 'ENOENT') {
      return res.status(404).json({ error: 'Conversation not found', path: conversationPath });
    }
    res.status(500).json({ error: 'Failed to read conversation', message: err.message });
  }
});

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  console.log('\nShutting down server...');
  await cleanupPortFile();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await cleanupPortFile();
  process.exit(0);
});

// Start the server
async function startServer(): Promise<void> {
  try {
    const port = await findAvailablePort(DEFAULT_PORT);
    await writePortFile(port);
    
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
      if (port !== DEFAULT_PORT) {
        console.log(`(Default port ${DEFAULT_PORT} was in use, using fallback)`);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
