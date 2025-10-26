// mockServer.js
import jsonServer from 'json-server';
const server = jsonServer.create();
const router = jsonServer.router('mockData.json');
const middlewares = jsonServer.defaults();

server.use(middlewares);
server.use(jsonServer.bodyParser);

server.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Missing credentials' });
  }

  const newUser = { id: Date.now(), name, email, password, role: 'patient' };
  router.db.get('users').push(newUser).write();

  res.json({
    message: 'User registered successfully!',
    token: 'mock-jwt-token-' + newUser.id,
    role: newUser.role,
  });
});

server.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = router.db.get('users').find({ email, password }).value();

  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  res.json({
    token: 'mock-jwt-token-' + user.id,
    role: user.role,
  });
});

server.use('/api', router);

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`✅ Mock API server running on http://localhost:${PORT}`);
});
