const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');

const projectsRouter = require('./routes/projects');
const tasksRouter = require('./routes/tasks');
const teamMembersRouter = require('./routes/teamMembers');
const itemsRouter = require('./routes/items');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 5000;
const mongoUrl = process.env.MONGODB_URL;

if (!mongoUrl) {
  throw new Error('Missing MONGODB_URL in .env');
}

app.use(cors());
app.use(express.json());
app.use(helmet());
app.use(morgan('dev'));

app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/projects', projectsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/team-members', teamMembersRouter);
app.use('/api/items', itemsRouter);

mongoose.set('strictQuery', true);

mongoose
  .connect(mongoUrl, {
    autoIndex: true,
  })
  .then(() => {
    console.log('MongoDB database connection established successfully');
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB', error);
    process.exit(1);
  });
