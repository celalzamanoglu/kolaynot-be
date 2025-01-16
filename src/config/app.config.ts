export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  mongodb: {
    uri: process.env.MONGODB_URI,
  },
  google: {
    projectId: process.env.GOOGLE_PROJECT_ID,
    credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    storageBucket: process.env.GOOGLE_STORAGE_BUCKET,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    assistantId: process.env.OPENAI_ASSISTANT_ID,
  },
  revenuecat: {
    apiKey: process.env.REVENUECAT_API_KEY,
  },
});
