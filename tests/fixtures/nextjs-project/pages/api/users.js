// Next.js API route example
import { authenticate } from '../../middleware/auth';

export default async function handler(req, res) {
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        // Get all users
        const users = await getUsersFromDB();
        res.status(200).json({ users });
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
      }
      break;
      
    case 'POST':
      try {
        await authenticate(req, res);
        const { name, email } = req.body;
        
        if (!name || !email) {
          return res.status(400).json({ error: 'Name and email required' });
        }
        
        const user = await createUser({ name, email });
        res.status(201).json({ user });
      } catch (error) {
        res.status(500).json({ error: 'Failed to create user' });
      }
      break;
      
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}

async function getUsersFromDB() {
  // Database query simulation
  return [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
  ];
}

async function createUser(userData) {
  // Database creation simulation
  return { id: Date.now(), ...userData };
}