const pool = require('./config/database');

async function checkPhotos() {
  try {
    const [photos] = await pool.query('SELECT * FROM photos');
    console.log('Photos in database:', photos);
    console.log('Total count:', photos.length);
  } catch (error) {
    console.error('Error checking photos:', error);
  }
  process.exit(0);
}

checkPhotos();
