"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Boot the workflow worker (starts listening for BullMQ jobs)
require("./services/workflow.worker");
const PORT = process.env.PORT || 8000;
app_1.app.listen(PORT, () => {
    console.log(`Server is running at port ${PORT}`);
});
