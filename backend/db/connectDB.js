import dns from "node:dns";
import mongoose from "mongoose";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const connectMongoDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB connection: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error connection to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

export default connectMongoDB;