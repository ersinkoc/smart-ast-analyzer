const express = require('express');
const app = express();
const router = express.Router();

// Test API endpoints
app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

app.post('/api/users', (req, res) => {
  res.json({ user: req.body });
});

router.get('/api/products', (req, res) => {
  res.json({ products: [] });
});

router.delete('/api/products/:id', (req, res) => {
  res.json({ deleted: req.params.id });
});

app.use(router);

app.listen(3000);