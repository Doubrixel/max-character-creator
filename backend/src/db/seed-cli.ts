import { seedIfNeeded } from './seed';

seedIfNeeded()
  .then(() => {
    console.log('Seed finished.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
