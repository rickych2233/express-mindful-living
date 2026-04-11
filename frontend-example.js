// Contoh implementasi API di frontend menggunakan fetch API

// Base URL untuk API
const API_URL = 'http://localhost:3001';

// Fungsi untuk membuat user baru
async function createUser(userData) {
  try {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Gagal membuat user');
    }

    return data;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

// Fungsi untuk mendapatkan semua user
async function getAllUsers() {
  try {
    const response = await fetch(`${API_URL}/users`);
    
    if (!response.ok) {
      throw new Error('Gagal mengambil data users');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

// Fungsi untuk mendapatkan user berdasarkan ID
async function getUserById(id) {
  try {
    const response = await fetch(`${API_URL}/users/${id}`);
    
    if (!response.ok) {
      throw new Error('Gagal mengambil data user');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}

// Fungsi untuk update user
async function updateUser(id, userData) {
  try {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Gagal mengupdate user');
    }

    return data;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

// Fungsi untuk menghapus user
async function deleteUser(id) {
  try {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Gagal menghapus user');
    }

    return data;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

// Contoh penggunaan di React component
function UserForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      const result = await createUser(formData);
      setMessage(result.message);
      setFormData({ name: '', email: '', password: '' });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h2>Form Registrasi User</h2>
      {message && <div style={{ color: 'green' }}>{message}</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div>
          <label>Name:</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        
        <div>
          <label>Email:</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        
        <div>
          <label>Password:</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>
        
        <button type="submit">Register</button>
      </form>
    </div>
  );
}

// Contoh penggunaan di vanilla JavaScript
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('userForm');
  const messageDiv = document.getElementById('message');
  
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
      };
      
      try {
        const result = await createUser(formData);
        messageDiv.textContent = result.message;
        messageDiv.style.color = 'green';
        form.reset();
      } catch (error) {
        messageDiv.textContent = error.message;
        messageDiv.style.color = 'red';
      }
    });
  }
});