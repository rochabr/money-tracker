import React, { useState, useEffect, useCallback } from 'react'
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
  const [expandedInstitutions, setExpandedInstitutions] = useState({})
  const [copySuccess, setCopySuccess] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [selectedAccounts, setSelectedAccounts] = useState({})
  const [groupBy, setGroupBy] = useState('institution')
  const [expandedGroups, setExpandedGroups] = useState({})
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false)
  const [netWorthHistory, setNetWorthHistory] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const viewOptions = [
    { label: 'By institution', value: 'group' },
    { label: 'By type', value: 'list' }
  ]
  const currentView = groupBy === 'institution' ? 'group' : 'list'

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

  const calculateNetWorth = useCallback((accounts) => {
    const totals = {
      assets: {},
      liabilities: {},
      netWorth: {},
      metrics: {}
    }

    accounts.forEach(institution => {
      institution.accounts.forEach(account => {
        const amount = account.balances.current || 0
        const currency = account.balances.iso_currency_code

        // Initialize currency totals if they don't exist
        if (!totals.assets[currency]) totals.assets[currency] = 0
        if (!totals.liabilities[currency]) totals.liabilities[currency] = 0
        if (!totals.netWorth[currency]) totals.netWorth[currency] = 0

        // Check if account is a liability (credit or loan)
        const isLiability = account.type.toLowerCase() === 'credit' || 
                          account.type.toLowerCase() === 'loan'

        if (isLiability) {
          totals.liabilities[currency] += amount
          totals.netWorth[currency] -= amount
        } else {
          totals.assets[currency] += amount
          totals.netWorth[currency] += amount
        }
      })
    })

    // Calculate metrics for each currency
    Object.keys(totals.netWorth).forEach(currency => {
      const assets = totals.assets[currency] || 0
      const liabilities = totals.liabilities[currency] || 0
      const netWorth = totals.netWorth[currency] || 0

      totals.metrics[currency] = {
        debtToAssetRatio: liabilities > 0 ? (liabilities / assets) * 100 : 0,
        assetPercentage: assets > 0 ? (assets / (assets + liabilities)) * 100 : 0,
        liabilityPercentage: liabilities > 0 ? (liabilities / (assets + liabilities)) * 100 : 0,
        netWorthChange: netWorth > 0 ? 'positive' : netWorth < 0 ? 'negative' : 'neutral'
      }
    })

    return totals
  }, [])

  const loadLocalData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`http://localhost:8000/plaid/user/saved-data?user_id=${userId}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load local data')
      }
      
      // Update state with local data
      if (data.accounts && data.accounts.length > 0) {
        setAccounts(data.accounts)
        // Calculate current net worth from accounts
        const currentNetWorth = calculateNetWorth(data.accounts)
        setNetWorth(currentNetWorth)
      }
      
      if (data.holdings && data.holdings.length > 0) {
        setHoldings(data.holdings)
      }
      
      if (data.net_worth_history && data.net_worth_history.length > 0) {
        setNetWorthHistory(data.net_worth_history)
      }
      
      if (data.last_updated) {
        setLastUpdated(new Date(data.last_updated))
      }
    } catch (error) {
      console.error('Error loading local data:', error)
      setError(`Error loading local data: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const loadSavedData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`http://localhost:8000/plaid/user/saved-data?user_id=${userId}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load saved data')
      }
      
      // Update state with saved data if available
      if (data.accounts) {
        setAccounts(data.accounts)
        // Calculate current net worth from saved accounts
        const currentNetWorth = calculateNetWorth(data.accounts)
        setNetWorth(currentNetWorth)
      }
      
      if (data.holdings) {
        setHoldings(data.holdings)
      }
      
      if (data.last_updated) {
        setLastUpdated(new Date(data.last_updated))
      }
    } catch (error) {
      console.error('Error loading saved data:', error)
      setError(`Error loading saved data: ${error.message}`)
    } finally {
      setIsLoading(false)
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
      
      // Update last updated timestamp
      setLastUpdated(new Date())
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

  const toggleAccountSelection = (institution, accountId) => {
    setSelectedAccounts(prev => {
      const newSelection = { ...prev }
      if (!newSelection[institution]) {
        newSelection[institution] = new Set()
      } else {
        newSelection[institution] = new Set(newSelection[institution])
      }
      
      if (newSelection[institution].has(accountId)) {
        newSelection[institution].delete(accountId)
        if (newSelection[institution].size === 0) {
          delete newSelection[institution]
        }
      } else {
        newSelection[institution].add(accountId)
      }
      
      return newSelection
    })
  }

  const isAccountSelected = (institution, accountId) => {
    return selectedAccounts[institution]?.has(accountId) || false
  }

  const hasSelectedAccounts = () => {
    return Object.values(selectedAccounts).some(accounts => accounts.size > 0)
  }

  const exportHoldingsData = useCallback(() => {
    const holdingsData = holdings
      .filter(institution => selectedAccounts[institution.institution])
      .map(institution => ({
        institution: institution.institution,
        holdings: institution.holdings?.holdings
          ?.filter(holding => selectedAccounts[institution.institution].has(holding.account_id))
          .map(holding => {
            const security = institution.holdings?.securities?.find(
              s => s.security_id === holding.security_id
            )
            const account = accounts
              .find(inst => inst.institution === institution.institution)
              ?.accounts.find(acc => acc.account_id === holding.account_id)
            
            return {
              name: security?.name || 'Unknown Security',
              current_value: holding.institution_value,
              currency: holding.iso_currency_code,
              shares: holding.quantity,
              price_per_share: holding.institution_price,
              account_name: account?.name,
              account_type: account?.type
            }
          }) || []
      }))
      .filter(institution => institution.holdings.length > 0)

    return JSON.stringify(holdingsData, null, 2)
  }, [holdings, selectedAccounts, accounts])

  const handleCopyHoldings = async () => {
    if (!hasSelectedAccounts()) {
      setError('Please select at least one account to export')
      return
    }

    try {
      await navigator.clipboard.writeText(exportHoldingsData())
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
      setError('Failed to copy holdings data')
    }
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
            <div className="modal-actions">
              <button 
                className="export-button"
                onClick={handleCopyHoldings}
                title="Copy holdings data for ChatGPT"
              >
                {copySuccess ? '✓ Copied!' : '📋 Export for ChatGPT'}
              </button>
              <button className="close-button" onClick={onClose}>&times;</button>
            </div>
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

  const ExportModal = ({ onClose }) => {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content export-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Export Holdings for ChatGPT</h3>
            <div className="modal-actions">
              <button 
                className="export-button"
                onClick={handleCopyHoldings}
                disabled={!hasSelectedAccounts()}
                title="Copy selected holdings data"
              >
                {copySuccess ? '✓ Copied!' : '📋 Export Selected'}
              </button>
              <button className="close-button" onClick={onClose}>&times;</button>
            </div>
          </div>
          <div className="modal-body">
            <div className="export-instructions">
              Select the accounts whose holdings you want to export. Only accounts with holdings will be shown.
            </div>
            <div className="accounts-selection">
              {accounts.map((institution) => {
                const accountsWithHoldings = institution.accounts.filter(acc => 
                  hasHoldings(acc.account_id, institution.institution)
                )
                
                if (accountsWithHoldings.length === 0) return null

                return (
                  <div key={institution.institution} className="institution-selection">
                    <div className="institution-header">
                      <div className="institution-name">{institution.institution}</div>
                    </div>
                    <div className="accounts-list">
                      {accountsWithHoldings.map(acc => (
                        <div 
                          key={acc.account_id} 
                          className={`account-selection ${isAccountSelected(institution.institution, acc.account_id) ? 'selected' : ''}`}
                          onClick={() => toggleAccountSelection(institution.institution, acc.account_id)}
                        >
                          <div className="account-info">
                            <div className="account-name">{acc.name}</div>
                            <div className="account-type">{acc.type}</div>
                          </div>
                          <div className="selection-indicator">
                            {isAccountSelected(institution.institution, acc.account_id) ? '✓' : ''}
                          </div>
                        </div>
                      ))}
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

  const toggleInstitution = (institutionName) => {
    setExpandedInstitutions(prev => ({
      ...prev,
      [institutionName]: !prev[institutionName]
    }))
  }

  const getGroupedAccounts = () => {
    if (groupBy === 'institution') {
      return accounts
    }

    // Group by account type
    const groupedByType = {}
    accounts.forEach(institution => {
      institution.accounts.forEach(account => {
        const type = account.type.toLowerCase()
        if (!groupedByType[type]) {
          groupedByType[type] = {
            institution: type.charAt(0).toUpperCase() + type.slice(1),
            accounts: []
          }
        }
        groupedByType[type].accounts.push({
          ...account,
          institution_name: institution.institution // Keep track of original institution
        })
      })
    })
    return Object.values(groupedByType)
  }

  const getLocaleForCurrency = (currency) => {
    const localeMap = {
      'USD': 'en-US',
      'CAD': 'en-CA',
      'BRL': 'pt-BR',
      'EUR': 'de-DE',
      'GBP': 'en-GB',
      'JPY': 'ja-JP',
      'AUD': 'en-AU',
      'CHF': 'de-CH',
      'CNY': 'zh-CN',
      'INR': 'en-IN',
      'MXN': 'es-MX',
      'SGD': 'en-SG',
      'HKD': 'zh-HK',
      'NZD': 'en-NZ',
      'SEK': 'sv-SE',
      'KRW': 'ko-KR',
      'NOK': 'nb-NO',
      'DKK': 'da-DK',
      'PLN': 'pl-PL',
      'RUB': 'ru-RU',
      'TRY': 'tr-TR',
      'ZAR': 'en-ZA'
    };
    return localeMap[currency] || 'en-US';
  };

  const formatCurrency = (amount, currency) => {
    const locale = getLocaleForCurrency(currency);
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return formatter.format(amount);
  };

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const handleViewSelect = (value) => {
    setViewDropdownOpen(false);
    setGroupBy(value === 'group' ? 'institution' : 'type');
  };

  useEffect(() => {
    checkAccessToken()
  }, [])

  useEffect(() => {
    if (!viewDropdownOpen) return;
    const handleClick = (e) => {
      if (!e.target.closest('.view-dropdown-container')) {
        setViewDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [viewDropdownOpen]);

  // Load local data on component mount
  useEffect(() => {
    loadLocalData()
  }, [])

  // Load saved data on component mount
  useEffect(() => {
    loadSavedData()
  }, [])

  return (
    <div className="App">
      <header className="App-header">
        {lastUpdated && (
          <div className="last-updated">
            Last updated: {lastUpdated.toLocaleString()}
          </div>
        )}
        <div className="action-buttons-row">
          <button 
            className="action-card-btn" 
            onClick={fetchAllData} 
            disabled={isLoading}
          >
            <span className="action-btn-icon">💰</span>
            <span className="action-btn-label">
              {isLoading ? 'Loading...' : 'Calculate Net Worth'}
            </span>
          </button>
          <button className="action-card-btn" onClick={handleLinkAccounts} disabled={isLoading}>
            <span className="action-btn-icon">🔗</span>
            <span className="action-btn-label">Link Account</span>
          </button>
          <button className="action-card-btn" onClick={() => setShowExportModal(true)} disabled={isLoading || !holdings.length}>
            <span className="action-btn-icon">📈</span>
            <span className="action-btn-label">Export Holdings</span>
          </button>
          <button className="action-card-btn" type="button">
            <span className="action-btn-icon">➕</span>
            <span className="action-btn-label">Add asset manually</span>
          </button>
        </div>
        {hasAccessToken ? (
          <div className="logged-in-section">
            <p>Logged in to: {loggedInInstitution}</p>
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
              <div className="section-header">
                <h2>Net Worth</h2>
                {netWorthHistory.length > 0 && (
                  <button 
                    className="history-button"
                    onClick={() => setShowHistoryModal(true)}
                  >
                    View History
                  </button>
                )}
              </div>
              {netWorth ? (
                <div>
                  <div className="net-worth-list">
                    {Object.entries(calculateNetWorth(accounts).netWorth).map(([currency, amount]) => {
                      const metrics = calculateNetWorth(accounts).metrics[currency]
                      const assets = calculateNetWorth(accounts).assets[currency] || 0
                      const liabilities = calculateNetWorth(accounts).liabilities[currency] || 0
                      
                      return (
                        <div key={currency} className="net-worth-item">
                          <div className="currency">{currency}</div>
                          <div className={`amount ${metrics.netWorthChange} net-worth-title`}>
                            {formatCurrency(amount, currency)}
                          </div>
                          <div className="breakdown">
                            <div className="assets">
                              <div className="label">Assets</div>
                              <div className="value">{formatCurrency(assets, currency)}</div>
                              <div className="percentage">
                                {metrics.assetPercentage.toFixed(1)}% of total
                              </div>
                            </div>
                            <div className="liabilities">
                              <div className="label">Liabilities</div>
                              <div className="value">{formatCurrency(liabilities, currency)}</div>
                              <div className="percentage">
                                {metrics.liabilityPercentage.toFixed(1)}% of total
                              </div>
                            </div>
                            <div className="metrics">
                              <div className="metric">
                                <div className="label">Debt-to-Asset Ratio</div>
                                <div className="value">{metrics.debtToAssetRatio.toFixed(1)}%</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <p>No data available. Click "Calculate Net Worth" to fetch your data.</p>
              )}
            </section>
            <section>
              <div className="section-header">
                <h2>Accounts</h2>
                <div className="view-dropdown-container">
                  <button
                    className="view-dropdown-btn"
                    onClick={() => setViewDropdownOpen(v => !v)}
                    aria-haspopup="listbox"
                    aria-expanded={viewDropdownOpen}
                  >
                    {currentView === 'group' ? 'By institution' : 'By type'}
                    <span className="dropdown-arrow">{viewDropdownOpen ? '▲' : '▼'}</span>
                  </button>
                  {viewDropdownOpen && (
                    <div className="view-dropdown-menu" tabIndex={-1}>
                      {viewOptions.map(opt => (
                        <div
                          key={opt.value}
                          className={`view-dropdown-option${currentView === opt.value ? ' selected' : ''}`}
                          onClick={() => handleViewSelect(opt.value)}
                          tabIndex={0}
                          role="option"
                          aria-selected={currentView === opt.value}
                        >
                          <span>{opt.label}</span>
                          {currentView === opt.value && <span className="dropdown-check">✓</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {accounts.length > 0 ? (
                <div className="accounts-list-modern">
                  {getGroupedAccounts().map(group => {
                    const isExpandable = group.accounts.length > 1;
                    const isExpanded = expandedGroups[group.institution] ?? false;
                    const totalValue = group.accounts.reduce((sum, acc) => sum + (acc.balances.current || 0), 0);
                    const currency = group.accounts[0]?.balances?.iso_currency_code || '';
                    // Determine if this group is investment type
                    const isInvestmentGroup = group.accounts.some(acc => (acc.type || '').toLowerCase() === 'investment');
                    return (
                      <div key={group.institution} className={`account-group-card-modern${isExpandable ? ' expandable' : ''}${isExpanded ? ' expanded' : ''}`}
                        onClick={isExpandable ? () => toggleGroup(group.institution) : undefined}
                        style={{cursor: isExpandable ? 'pointer' : 'default'}}
                      >
                        <div className="account-group-card-main">
                          <div className="account-group-card-labels">
                            <div className="account-group-card-title">{group.institution}</div>
                            <div className="account-group-card-subtitle">
                              {isExpandable ? `${group.accounts.length} accounts` : group.accounts[0]?.type || ''}
                            </div>
                          </div>
                          <div className="account-group-card-balance-group">
                            <div className="account-group-card-balance">{formatCurrency(totalValue, currency)}</div>
                            {/* Show chevron if expandable */}
                            {isExpandable && (
                              <span className={`chevron${isExpanded ? ' expanded' : ''}`} style={{marginLeft: 12, fontSize: '1.2em', transition: 'transform 0.2s'}}>
                                {isExpanded ? '▼' : '▶'}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Expanded list of accounts */}
                        {isExpandable && isExpanded && (
                          <div className="account-group-card-accounts">
                            {group.accounts.map(acc => (
                              <div key={acc.account_id} className="account-card-modern sub-account">
                                <div className="account-card-main">
                                  <div className="account-card-labels">
                                    <div className="account-card-title">{acc.name}</div>
                                    <div className="account-card-subtitle">{groupBy === 'type' ? acc.institution_name : acc.type}</div>
                                  </div>
                                  <div className="account-card-balance-group">
                                    <div className="account-card-balance">{formatCurrency(acc.balances.current, acc.balances.iso_currency_code)}</div>
                                    {acc.growth_percent && (
                                      <div className="account-card-growth">+{acc.growth_percent}% all time</div>
                                    )}
                                    {/* Show subtle holdings button for investment sub-accounts */}
                                    {(acc.type || '').toLowerCase() === 'investment' && (
                                      <button className="holdings-subtle-btn" onClick={e => { e.stopPropagation(); handleViewHoldings(acc.account_id, acc.institution_name || group.institution); }}>
                                        Show holdings
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
      {showExportModal && (
        <ExportModal onClose={() => {
          setShowExportModal(false)
          setSelectedAccounts({})
        }} />
      )}
      {showHistoryModal && (
        <HistoryModal 
          history={netWorthHistory}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </div>
  )
}

const HistoryModal = ({ history, onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Net Worth History</h3>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="history-list">
            {history.map((entry, index) => (
              <div key={index} className="history-entry">
                <div className="history-date">
                  {new Date(entry.date).toLocaleString()}
                </div>
                <div className="history-details">
                  {Object.entries(entry.net_worth).map(([currency, amount]) => (
                    <div key={currency} className="history-currency">
                      <div className="currency">{currency}</div>
                      <div className="amount">{formatCurrency(amount, currency)}</div>
                      <div className="breakdown">
                        <div className="assets">
                          Assets: {formatCurrency(entry.assets[currency], currency)}
                        </div>
                        <div className="liabilities">
                          Liabilities: {formatCurrency(entry.liabilities[currency], currency)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
