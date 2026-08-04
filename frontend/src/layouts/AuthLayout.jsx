import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#000' }}>
      
      {/* Left side - Background Image */}
      <div style={{ 
        flex: 1, 
        display: 'none', 

        backgroundImage: 'url("https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=2070&auto=format&fit=crop")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative'
      }} className="desktop-only-bg">
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to right, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.9) 100%)'
        }}></div>
      </div>

      {/* Right side - Auth Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        padding: '2rem'
      }}>
        {/* Background decorative circles */}
        <div style={{
          position: 'absolute', top: '-10%', right: '-5%', width: '300px', height: '300px',
          borderRadius: '50%', backgroundColor: 'rgba(23, 23, 100, 0.4)', filter: 'blur(60px)', zIndex: 0
        }}></div>
        <div style={{
          position: 'absolute', bottom: '-10%', right: '10%', width: '400px', height: '400px',
          borderRadius: '50%', backgroundColor: 'rgba(23, 23, 100, 0.4)', filter: 'blur(80px)', zIndex: 0
        }}></div>
        <div style={{
          position: 'absolute', top: '30%', left: '5%', width: '200px', height: '200px',
          borderRadius: '50%', backgroundColor: 'rgba(23, 23, 100, 0.5)', filter: 'blur(50px)', zIndex: 0
        }}></div>

        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '400px', margin: '0 auto' }}>
          <div style={{ textAlign: 'right', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>trade<span style={{color: '#fff'}}>Me</span></h2>
          </div>
          <Outlet />
        </div>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .desktop-only-bg {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
