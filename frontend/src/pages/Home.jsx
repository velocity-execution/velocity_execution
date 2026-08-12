import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');

    navigate('/login');
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="min-h-screen bg-[#050505] text-white">

      {/* Navbar */}
      <nav className="border-b border-white/10 bg-[#0a0a0a] px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">

          <h1 className="text-2xl font-bold">
            Veloci<span className="text-blue-500">ty</span>
          </h1>

          <div className="flex items-center gap-6 text-sm text-gray-400">
            <button className="hover:text-white">
              Markets
            </button>

            <button className="hover:text-white">
              Trade
            </button>

            <button className="hover:text-white">
              Orders
            </button>

            <button className="hover:text-white">
              Wallet
            </button>

            <button className="hover:text-white">
              Positions
            </button>

            <div className="h-5 w-px bg-white/10" />

            <span className="text-white">
              {user.name || user.username || 'User'}
            </span>

            <button
              onClick={handleLogout}
              className="rounded-lg border border-white/10 px-4 py-2 text-gray-300 transition hover:bg-white/5 hover:text-white"
            >
              Logout
            </button>
          </div>

        </div>
      </nav>


      {/* Main */}
      <main className="mx-auto max-w-7xl px-6 py-8">

        {/* Welcome */}
        <section className="mb-8">
          <h2 className="text-3xl font-semibold">
            Welcome back{user.name ? `, ${user.name}` : ''}
          </h2>

          <p className="mt-2 text-gray-500">
            Trade digital assets with Velocity.
          </p>
        </section>


        {/* Market Overview */}
        <section className="mb-6">

          <h3 className="mb-4 text-lg font-medium">
            Markets
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

            <MarketCard
              symbol="BTC/USDT"
              price="--"
              change="--"
            />

            <MarketCard
              symbol="ETH/USDT"
              price="--"
              change="--"
            />

            <MarketCard
              symbol="USDT"
              price="--"
              change="--"
            />

          </div>

        </section>


        {/* Trading Area */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Chart */}
          <div className="rounded-xl border border-white/10 bg-[#0a0a0a] lg:col-span-2">

            <div className="border-b border-white/10 px-5 py-4">
              <div className="flex items-center justify-between">

                <div>
                  <h3 className="font-medium">
                    BTC/USDT
                  </h3>

                  <span className="text-xs text-gray-500">
                    Market Chart
                  </span>
                </div>

                <div className="flex gap-2 text-xs text-gray-500">
                  <button className="rounded px-2 py-1 hover:bg-white/5">
                    1m
                  </button>

                  <button className="rounded px-2 py-1 hover:bg-white/5">
                    5m
                  </button>

                  <button className="rounded px-2 py-1 hover:bg-white/5">
                    1h
                  </button>

                  <button className="rounded px-2 py-1 hover:bg-white/5">
                    1D
                  </button>
                </div>

              </div>
            </div>

            <div className="flex h-[400px] items-center justify-center text-gray-600">
              Chart will appear here
            </div>

          </div>


          {/* Order Book */}
          <div className="rounded-xl border border-white/10 bg-[#0a0a0a]">

            <div className="border-b border-white/10 px-5 py-4">
              <h3 className="font-medium">
                Order Book
              </h3>

              <p className="text-xs text-gray-500">
                BTC/USDT
              </p>
            </div>

            <div className="p-5">

              <div className="mb-6">

                <div className="mb-2 grid grid-cols-3 text-xs text-gray-600">
                  <span>Price</span>
                  <span>Size</span>
                  <span>Total</span>
                </div>

                {[1, 2, 3, 4, 5].map((item) => (
                  <div
                    key={`ask-${item}`}
                    className="grid grid-cols-3 py-1 text-sm"
                  >
                    <span className="text-red-400">--</span>
                    <span className="text-gray-400">--</span>
                    <span className="text-gray-500">--</span>
                  </div>
                ))}

              </div>


              <div className="my-4 border-y border-white/10 py-3 text-center">
                <span className="text-sm text-gray-500">
                  Spread --
                </span>
              </div>


              <div>

                {[1, 2, 3, 4, 5].map((item) => (
                  <div
                    key={`bid-${item}`}
                    className="grid grid-cols-3 py-1 text-sm"
                  >
                    <span className="text-green-400">--</span>
                    <span className="text-gray-400">--</span>
                    <span className="text-gray-500">--</span>
                  </div>
                ))}

              </div>

            </div>

          </div>

        </section>


        {/* Order Entry */}
        <section className="mt-6 rounded-xl border border-white/10 bg-[#0a0a0a]">

          <div className="border-b border-white/10 px-5 py-4">
            <h3 className="font-medium">
              Place Order
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">

            {/* Buy */}
            <OrderForm
              title="Buy BTC"
              button="Buy BTC"
              type="buy"
            />

            {/* Sell */}
            <OrderForm
              title="Sell BTC"
              button="Sell BTC"
              type="sell"
            />

          </div>

        </section>


        {/* Bottom Sections */}
        <section className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">

          {/* Open Orders */}
          <div className="rounded-xl border border-white/10 bg-[#0a0a0a]">

            <div className="border-b border-white/10 px-5 py-4">
              <h3 className="font-medium">
                Open Orders
              </h3>
            </div>

            <div className="flex h-32 items-center justify-center text-sm text-gray-600">
              No open orders
            </div>

          </div>


          {/* Portfolio */}
          <div className="rounded-xl border border-white/10 bg-[#0a0a0a]">

            <div className="border-b border-white/10 px-5 py-4">
              <h3 className="font-medium">
                Portfolio
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4 p-5">

              <Balance
                title="Total Balance"
                value="--"
              />

              <Balance
                title="Available"
                value="--"
              />

              <Balance
                title="BTC"
                value="--"
              />

              <Balance
                title="USDT"
                value="--"
              />

            </div>

          </div>

        </section>

      </main>

    </div>
  );
}


/* ---------------- Components ---------------- */

function MarketCard({ symbol, price, change }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0a0a] p-5">

      <div className="flex items-center justify-between">

        <span className="font-medium">
          {symbol}
        </span>

        <span className="text-xs text-gray-500">
          24h
        </span>

      </div>

      <div className="mt-4 flex items-end justify-between">

        <span className="text-xl font-semibold">
          {price}
        </span>

        <span className="text-sm text-gray-500">
          {change}
        </span>

      </div>

    </div>
  );
}


function OrderForm({ title, button, type }) {
  const isBuy = type === 'buy';

  return (
    <div>

      <h4 className="mb-4 font-medium">
        {title}
      </h4>

      <div className="space-y-3">

        <input
          type="number"
          placeholder="Price"
          className="w-full rounded-lg border border-white/10 bg-[#050505] px-4 py-3 text-sm outline-none placeholder:text-gray-600 focus:border-blue-500"
        />

        <input
          type="number"
          placeholder="Quantity"
          className="w-full rounded-lg border border-white/10 bg-[#050505] px-4 py-3 text-sm outline-none placeholder:text-gray-600 focus:border-blue-500"
        />

        <input
          type="number"
          placeholder="Total"
          className="w-full rounded-lg border border-white/10 bg-[#050505] px-4 py-3 text-sm outline-none placeholder:text-gray-600 focus:border-blue-500"
        />

        <div className="grid grid-cols-4 gap-2">

          {['25%', '50%', '75%', '100%'].map((percentage) => (
            <button
              key={percentage}
              className="rounded-md border border-white/10 py-2 text-xs text-gray-500 hover:bg-white/5 hover:text-white"
            >
              {percentage}
            </button>
          ))}

        </div>

        <button
          className={`w-full rounded-lg py-3 text-sm font-medium transition ${
            isBuy
              ? 'bg-green-600 hover:bg-green-500'
              : 'bg-red-600 hover:bg-red-500'
          }`}
        >
          {button}
        </button>

      </div>

    </div>
  );
}


function Balance({ title, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500">
        {title}
      </p>

      <p className="mt-1 text-lg font-medium">
        {value}
      </p>
    </div>
  );
}