import { createApp } from "../server/_core/app";

// Initialize the app lazily
let appHandler: any;

export default async function handler(req: any, res: any) {
    if (!appHandler) {
        const { app } = await createApp();
        appHandler = app;
    }
    return appHandler(req, res);
}
