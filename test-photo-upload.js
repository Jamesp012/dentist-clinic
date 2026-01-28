// Test script to verify photo upload works

// Test data
const testPhoto = {
  patientId: 1,
  type: 'before',
  url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  date: new Date().toISOString().split('T')[0],
  notes: 'Test photo from upload'
};

// Make the request
fetch('http://localhost:5000/api/photos', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  },
  body: JSON.stringify(testPhoto)
})
.then(r => {
  console.log('Response status:', r.status);
  return r.json();
})
.then(data => {
  console.log('Photo uploaded successfully:', data);
  
  // Now fetch all photos
  return fetch('http://localhost:5000/api/photos', {
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem('token')
    }
  }).then(r => r.json());
})
.then(photos => {
  console.log('All photos:', photos);
  console.log('Total photos:', photos.length);
})
.catch(error => console.error('Error:', error));
