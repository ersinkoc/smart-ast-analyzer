import React, { useState, useEffect } from 'react';

const UserCard = ({ userId, onUserUpdate }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }
      const userData = await response.json();
      setUser(userData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updatedData) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update user');
      }
      
      const updatedUser = await response.json();
      setUser(updatedUser);
      onUserUpdate?.(updatedUser);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="loading">Loading user...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div className="user-card">
      <div className="user-avatar">
        <img src={user.avatar || '/default-avatar.png'} alt={user.name} />
      </div>
      <div className="user-info">
        <h3>{user.name}</h3>
        <p>{user.email}</p>
        <p>{user.role}</p>
      </div>
      <div className="user-actions">
        <button onClick={() => handleUpdate({ active: !user.active })}>
          {user.active ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    </div>
  );
};

export default UserCard;