import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Check if temp user exists
    const existingUser = await prisma.user.findUnique({
      where: {
        id: 'temp-user-id',
      },
    });

    if (existingUser) {
      console.log('Temporary user already exists');
      return;
    }

    // Create temporary user
    await prisma.user.create({
      data: {
        id: 'temp-user-id',
        email: 'temp@example.com',
        // This is a placeholder hash, not a real password
        password: '$2a$10$SomeHashedPasswordStringForTheTemporaryUser',
      },
    });

    console.log('Temporary user created successfully');
  } catch (error) {
    console.error('Error creating temporary user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 