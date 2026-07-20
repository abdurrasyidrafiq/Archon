import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute, RequireOwner } from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Inventory from './pages/Inventory'
import Expenses from './pages/Expenses'
import Cashier from './pages/Cashier'
import Transactions from './pages/Transactions'
import TransactionDetail from './pages/TransactionDetail'
import Employees from './pages/Employees'
import CompanySettings from './pages/CompanySettings'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="kasir" element={<Cashier />} />
              <Route path="inventori" element={<Inventory />} />
              <Route path="pengeluaran" element={<Expenses />} />
              <Route path="transaksi" element={<Transactions />} />
              <Route path="transaksi/:id" element={<TransactionDetail />} />

              <Route element={<RequireOwner />}>
                <Route path="produk" element={<Products />} />
                <Route path="karyawan" element={<Employees />} />
                <Route path="pengaturan" element={<CompanySettings />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
