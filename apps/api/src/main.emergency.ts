// Emergency minimal bootstrap file
import { NestFactory } from '@nestjs/core';

// Minimal app module
class EmergencyAppModule {}

async function bootstrap() {
  try {
    const app = await NestFactory.create(EmergencyAppModule);
    
    const port = process.env.PORT || 3000;
    await app.listen(port);
    
    console.log(`🚀 Emergency API server running on port ${port}`);
    console.log('⚠️  This is a minimal emergency build with most features disabled');
    
  } catch (error) {
    console.error('❌ Failed to start emergency server:', error);
    process.exit(1);
  }
}

bootstrap();