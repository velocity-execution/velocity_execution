import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#050505', color: '#fff', padding: '2rem' }}>
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem',
        backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', marginBottom: '2rem',
        border: '1px solid rgba(255,255,255,0.05)'
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
          trade<span style={{color: '#3b82f6'}}>Me</span> Dashboard
        </h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#1f2937', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600' }}>
            JD
          </div>
          <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            Logout
          </button>
        </div>
      </header>

      <main style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        <div style={{
          gridColumn: '1 / -1', padding: '3rem', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(0,0,0,0) 100%)',
          borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.2)', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '-50%', right: '-10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(40px)', zIndex: 0 }}></div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Welcome back, John!</h1>
            <p style={{ color: '#a1a1aa', fontSize: '1.1rem' }}>Your portfolio is up +2.4% today. Keep it going!</p>
          </div>
        </div>

        {[1, 2, 3].map((item) => (
          <div key={item} style={{
            padding: '2rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)',
            minHeight: '200px', display: 'flex', flexDirection: 'column'
          }}>
            <h3 style={{ marginBottom: '1rem', color: '#a1a1aa', fontSize: '1rem' }}>Widget {item}</h3>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <span style={{ color: '#52525b' }}>Data Visualization</span>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
