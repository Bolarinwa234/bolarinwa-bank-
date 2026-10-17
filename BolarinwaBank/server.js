import connectDB from "./Config/databaseConfig.js";
import app from "./index.js";

const PORT = process.env.PORT || 8600;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();