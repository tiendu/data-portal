import React from 'react';
import { Form, Input, Button, message } from 'antd';
import axios from 'axios';

const App: React.FC = () => {
  const onFinish = async (values: { username: string; password: string }) => {
    try {
      const response = await axios.post('/api/auth/login', values);
      message.success('Logged in successfully!');
      console.log('JWT Token:', response.data.access_token);
      // After this, you might redirect to a 2FA verification page, etc.
    } catch (error) {
      message.error('Login failed!');
      console.error(error);
    }
  };

  return (
    <div style={{ maxWidth: 300, margin: 'auto', padding: '50px' }}>
      <h2>Login</h2>
      <Form name="login" onFinish={onFinish}>
        <Form.Item
          name="username"
          rules={[{ required: true, message: 'Please input your username!' }]}
        >
          <Input placeholder="Username" />
        </Form.Item>
        <Form.Item
          name="password"
          rules={[{ required: true, message: 'Please input your password!' }]}
        >
          <Input.Password placeholder="Password" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" style={{ width: '100%' }}>
            Log in
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default App;

