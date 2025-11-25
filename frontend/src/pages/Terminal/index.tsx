import React from 'react';
import WebShellProxy from '../WebShellProxy';

const Terminal: React.FC = () => {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <WebShellProxy />
    </div>
  );
};

export default Terminal;

