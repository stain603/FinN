# Dashboard Metrics Test Suite

## Overview

This test suite validates that all dashboard metrics remain correct after various system operations. It simulates 10 clients with different payment schedules and tests multiple scenarios to ensure no card becomes inconsistent after state changes.

## Test Scenarios

The test suite includes 13 comprehensive test scenarios:

1. **Initial State - Empty System**: Validates all metrics are zero when no data exists
2. **Create 10 Clients**: Creates clients with different payment frequencies (daily, weekly, monthly, annual)
3. **Process Payments**: Simulates payment processing for multiple clients
4. **Simulate Overdue Payments**: Tests delay scenarios and overdue status
5. **Complete Contract (Quitado)**: Validates contract completion logic
6. **Delete Client**: Tests client deletion and related data cleanup
7. **Delete Charge**: Tests charge deletion and metric recalculation
8. **Delete Payment**: Tests payment deletion and financial status updates
9. **Mark Charge as em_transito**: Tests in-transit status tracking
10. **Dashboard Data Validation**: Validates dashboard lists and counts
11. **Comprehensive Metrics Validation**: Final validation after all operations
12. **Edge Case - All Clients Quitado**: Tests when all contracts are completed
13. **Edge Case - All Clients Deleted**: Tests system reset to empty state

## Metrics Validated

The test suite validates all dashboard metrics:

- **Carteira Total**: Sum of all contract values
- **Capital Emprestado**: Sum of outstanding debt from active contracts
- **Total a Receber**: Sum of outstanding debt from non-quitado contracts
- **Recebido Hoje**: Sum of payments made today
- **Recebido Semana**: Sum of payments in the last 7 days
- **Recebido Mês**: Sum of payments in the current month
- **Inadimplência**: Quantity and value of overdue unpaid charges
- **Clientes Ativos**: Count of active contracts
- **Clientes Atrasados**: Count of overdue clients
- **Clientes Quitados**: Count of completed contracts
- **Empréstimos Ativos**: Total value of active contracts
- **Valores em Trânsito**: Total value of in-transit charges
- **Próximos Vencimentos**: Quantity and value of charges due in next 7 days
- **Lucro Previsto**: Estimated profit based on receivables
- **Taxa de Adimplência**: Percentage of on-time payments
- **Saldo Devedor Total**: Sum of all outstanding debts

## Dashboard Data Validated

The test suite also validates dashboard lists:

- **Clientes Atrasados**: List of overdue clients with days overdue
- **Clientes Hoje**: List of clients with payments due today
- **Pagos Hoje**: List of payments made today
- **Lista Semana**: List of charges due in the next 7 days
- **Contratos Concluídos**: List of completed contracts

## Running the Tests

### Prerequisites

Install the required dependencies:

```bash
npm install
```

### Run the Test Suite

```bash
npm run test:metrics
```

### Expected Output

The test suite will output detailed logs for each test scenario:

```
🚀 Starting Dashboard Metrics Test Suite

================================================================================

📌 TEST 1: Initial State - Empty System
--------------------------------------------------------------------------------
📊 Initial empty state
Expected: { carteiraTotal: 0, capitalEmprestado: 0, ... }
Actual: { carteiraTotal: 0, capitalEmprestado: 0, ... }
✅ All metrics correct for Initial empty state

...

================================================================================
✅ ALL TESTS PASSED SUCCESSFULLY!
================================================================================

📊 Summary:
- 13 test scenarios executed
- All dashboard metrics validated
- No inconsistencies found
- All edge cases handled correctly
```

## Test Data

The test suite uses 10 diverse clients:

| ID | Name | Service Value | Installment | Frequency |
|----|------|---------------|-------------|-----------|
| client-1 | João Silva | R$ 1.000 | R$ 100 | Diário |
| client-2 | Maria Santos | R$ 2.000 | R$ 200 | Diário |
| client-3 | Pedro Oliveira | R$ 3.000 | R$ 500 | Semanal |
| client-4 | Ana Costa | R$ 4.000 | R$ 400 | Semanal |
| client-5 | Carlos Lima | R$ 5.000 | R$ 500 | Mensal |
| client-6 | Julia Ferreira | R$ 6.000 | R$ 600 | Mensal |
| client-7 | Lucas Mendes | R$ 10.000 | R$ 1.000 | Anual |
| client-8 | Beatriz Alves | R$ 8.000 | R$ 800 | Mensal |
| client-9 | Ricardo Gomes | R$ 1.500 | R$ 150 | Semanal |
| client-10 | Fernanda Rocha | R$ 2.500 | R$ 250 | Diário |

## Failure Handling

If a test fails, the suite will:

1. Display the specific metric that failed
2. Show the expected vs actual values
3. Indicate which scenario caused the failure
4. Exit with error code 1

Example failure output:

```
❌ Metric carteiraTotal mismatch in After creating 10 clients: expected 44500, got 44000
```

## Continuous Integration

This test suite can be integrated into CI/CD pipelines to ensure metrics remain correct after code changes.

## Maintenance

When adding new metrics or modifying existing calculation logic:

1. Update the test suite to include the new metric
2. Add test scenarios that specifically test the new metric
3. Ensure all existing tests still pass
4. Update this README with the new metric information

## Notes

- The test suite uses in-memory data and does not affect the production database
- All dates are calculated relative to the current date for realistic testing
- The test suite is designed to be fast and can be run frequently during development
