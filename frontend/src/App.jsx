import React, { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [userId] = useState('user123') // In a real app, this would come from auth
  const [netWorth, setNetWorth] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [holdings, setHoldings] = useState([])
  const [error, setError] = useState(null)
  const [hasAccessToken, setHasAccessToken] = useState(false)
  const [loggedInInstitution, setLoggedInInstitution] = useState(null)
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [showHoldingsModal, setShowHoldingsModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const checkAccessToken = async () => {
    try {
      const response = await fetch(`http://localhost:8000/plaid/check_access_token?user_id=${userId}`)
      const data = await response.json()
      setHasAccessToken(data.has_access_token)
      setLoggedInInstitution(data.institution_name)
    } catch (error) {
      console.error('Error checking access token:', error)
      setError('Failed to check account status')
    }
  }

  const fetchAllData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Fetch net worth (which includes accounts) and holdings in parallel
      const [netWorthResponse, holdingsResponse] = await Promise.all([
        fetch(`http://localhost:8000/plaid/user/networth?user_id=${userId}`),
        fetch(`http://localhost:8000/plaid/user/holdings?user_id=${userId}`)
      ])

      if (!netWorthResponse.ok || !holdingsResponse.ok) {
        throw new Error('Failed to fetch data')
      }

      const [netWorthData, holdingsData] = await Promise.all([
        netWorthResponse.json(),
        holdingsResponse.json()
      ])

      // Update state with all data
      setNetWorth(netWorthData)
      setAccounts(netWorthData.accounts)
      setHoldings(holdingsData.holdings)
    } catch (error) {
      console.error('Error fetching data:', error)
      setError(`Error fetching data: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLinkAccounts = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(
        `http://localhost:8000/plaid/create_link_token?user_id=${userId}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      )
      const data = await response.json()
      const { link_token } = data

      const handler = window.Plaid.create({
        token: link_token,
        onSuccess: async (public_token, metadata) => {
          try {
            setIsLoading(true)
            const exchangeResponse = await fetch(
              `http://localhost:8000/plaid/exchange_token?user_id=${userId}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  public_token: public_token,
                  institution: metadata.institution.name,
                  institution_id: metadata.institution.institution_id
                })
              }
            )
            const exchangeData = await exchangeResponse.json()
            console.log('Access token:', exchangeData.access_token)
            await fetchAllData()
          } catch (error) {
            setError(`Error exchanging token: ${error.message}`)
            console.error('Error exchanging token:', error)
          } finally {
            setIsLoading(false)
          }
        },
        onExit: (err, metadata) => {
          if (err) {
            setError(`Plaid Link exited with error: ${err.display_message || err.error_message}`)
            console.error('Plaid Link exit error:', err)
          } else if (metadata) {
            console.log('Plaid Link exit metadata:', metadata)
          }
          setIsLoading(false)
        }
      })
      handler.open()
    } catch (error) {
      setError(`Error linking accounts: ${error.message}`)
      console.error('Error linking accounts:', error)
      setIsLoading(false)
    }
  }

  const handleViewHoldings = (accountId, institution) => {
    setSelectedAccount({ accountId, institution })
    setShowHoldingsModal(true)
  }

  const getAccountHoldings = (accountId, institution) => {
    const institutionHoldings = holdings.find(h => h.institution === institution)
    if (!institutionHoldings?.holdings?.holdings) return []
    
    return institutionHoldings.holdings.holdings.filter(
      holding => holding.account_id === accountId
    )
  }

  const hasHoldings = (accountId, institution) => {
    return getAccountHoldings(accountId, institution).length > 0
  }

  const HoldingsModal = ({ onClose }) => {
    if (!selectedAccount) return null

    const accountHoldings = getAccountHoldings(selectedAccount.accountId, selectedAccount.institution)
    const account = accounts
      .find(inst => inst.institution === selectedAccount.institution)
      ?.accounts.find(acc => acc.account_id === selectedAccount.accountId)

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Holdings for {account?.name}</h3>
            <button className="close-button" onClick={onClose}>&times;</button>
          </div>
          <div className="modal-body">
            <div className="holdings-grid">
              {accountHoldings.map(holding => {
                const security = holdings
                  .find(h => h.institution === selectedAccount.institution)
                  ?.holdings?.securities?.find(s => s.security_id === holding.security_id)
                return (
                  <div key={`${holding.security_id}-${holding.account_id}`} className="holding-card">
                    <div className="holding-name">{security?.name || 'Unknown Security'}</div>
                    <div className="holding-details">
                      <div className="detail-row">
                        <span className="label">Shares:</span>
                        <span className="value">{holding.quantity.toFixed(4)}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Price:</span>
                        <span className="value">{holding.institution_price.toFixed(2)} {holding.iso_currency_code}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Total Value:</span>
                        <span className="value">{holding.institution_value.toFixed(2)} {holding.iso_currency_code}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  useEffect(() => {
    checkAccessToken()
  }, [])

  return (
    <div className="App">
      <header className="App-header">
        <h1>Money Tracker</h1>
        {hasAccessToken ? (
          <div className="logged-in-section">
            <p>Logged in to: {loggedInInstitution}</p>
            <div className="button-group">
              <button 
                onClick={fetchAllData} 
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Calculate Net Worth'}
              </button>
              <button onClick={handleLinkAccounts} className="secondary" disabled={isLoading}>
                Link Another Account
              </button>
            </div>
          </div>
        ) : (
          <button onClick={handleLinkAccounts} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Link Accounts'}
          </button>
        )}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </header>
      <main>
        {isLoading && !netWorth ? (
          <div className="loading-state">Loading account data...</div>
        ) : (
          <>
            <section>
              <h2>Net Worth</h2>
              {netWorth ? (
                <div>
                  <div className="net-worth-list">
                    {Object.entries(netWorth.net_worth).map(([currency, amount]) => (
                      <div key={currency} className="net-worth-item">
                        <div className="currency">{currency}</div>
                        <div className="amount">{amount.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p>No data available</p>
              )}
            </section>
            <section>
              <h2>Accounts</h2>
              {accounts.length > 0 ? (
                <div className="accounts-list">
                  {accounts.map((institution) => (
                    <div key={institution.institution} className="institution-group">
                      <div className="institution-name">{institution.institution}</div>
                      <div className="account-grid">
                        {institution.accounts.map(acc => (
                          <div key={acc.account_id} className="account-item">
                            <div className="account-name">{acc.name}</div>
                            <div className="account-balance">
                              {acc.balances.current.toFixed(2)}
                              <span className="account-currency"> {acc.balances.iso_currency_code}</span>
                            </div>
                            {hasHoldings(acc.account_id, institution.institution) && (
                              <button 
                                className="holdings-link"
                                onClick={() => handleViewHoldings(acc.account_id, institution.institution)}
                              >
                                See Holdings
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No accounts available</p>
              )}
            </section>
          </>
        )}
      </main>
      {showHoldingsModal && (
        <HoldingsModal onClose={() => setShowHoldingsModal(false)} />
      )}
    </div>
  )
}

export default App
