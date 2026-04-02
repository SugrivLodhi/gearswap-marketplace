const ADMIN_API_URL = process.env.NEXT_PUBLIC_ADMIN_API_URL || 'http://localhost:8000';

class AdminAPI {
  private static getHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  static async getStats() {
    const res = await fetch(`${ADMIN_API_URL}/stats/`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  }

  static async listUsers(role?: string) {
    const url = new URL(`${ADMIN_API_URL}/users/`);
    if (role) url.searchParams.append('role', role);
    
    const res = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  }

  static async deleteUser(userId: string) {
    const res = await fetch(`${ADMIN_API_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete user');
    return res.json();
  }
  static async listSellers() {
    const res = await fetch(`${ADMIN_API_URL}/sellers/`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch sellers');
    return res.json();
  }

  static async getSellerStats(sellerId: string) {
    const res = await fetch(`${ADMIN_API_URL}/sellers/${sellerId}/stats`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch seller stats');
    return res.json();
  }

  static async listProducts() {
    const res = await fetch(`${ADMIN_API_URL}/products/`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch products');
    return res.json();
  }

  static async deleteProduct(productId: string) {
    const res = await fetch(`${ADMIN_API_URL}/products/${productId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to moderate product');
    return res.json();
  }
}

export default AdminAPI;
