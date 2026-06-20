# Financial Model Audit Report
## Task 2 — Refatoração Completa da Modelagem Financeira

### Current Data Model Analysis

#### Client Type Fields:
**Core Fields:**
- `id`: string
- `nome`: string
- `numero`: string (phone number - should be `telefone`)
- `endereco`?: string (optional)
- `observacao`?: string (optional)

**Financial Fields:**
- `valorEmprestado`: number (money given to client)
- `valorTotalReceber`: number (total to receive at end)
- `valorParcela`: number (installment amount)
- `tipoPagamento`: "Diário" | "Semanal" | "Mensal" | "Anual"

**Calculated Fields (optional - SHOULD BE REQUIRED):**
- `lucroEsperado`?: number (calculated as valorTotalReceber - valorEmprestado)
- `valorRecebido`?: number (total paid so far)
- `saldoDevedor`?: number (valorTotalReceber - valorRecebido)
- `totalParcelas`?: number (calculated as valorTotalReceber / valorParcela)
- `parcelasPagas`?: number (calculated from payments)
- `parcelasRestantes`?: number (totalParcelas - parcelasPagas)
- `dataTermino`?: string (end date)
- `proximoVencimento`?: string (next due date)

**Status Fields:**
- `ativo`: boolean
- `dataCadastro`: string (should be `dataInicio`)
- `statusContrato`?: "ativo" | "pendente" | "atrasado" | "quitado" | "cancelado"

### Issues Identified:

#### 1. Field Naming Inconsistencies
- `numero` should be `telefone` for clarity
- `dataCadastro` should be `dataInicio` to match business terminology
- `tipoPagamento` should be `frequencia` for clarity

#### 2. Optional Calculated Fields
- Many calculated fields are optional but should be required:
  - `lucroEsperado` should be required
  - `valorRecebido` should be required (default 0)
  - `saldoDevedor` should be required
  - `totalParcelas` should be required
  - `parcelasPagas` should be required (default 0)
  - `parcelasRestantes` should be required
  - `dataTermino` should be required
  - `proximoVencimento` should be required

#### 3. Redundant Migration Logic
- Old `valorServico` field still referenced in AppContext migration code
- This should be removed after migration is complete

#### 4. Missing Payment History
- No proper payment history tracking on client level
- Payment history exists only in separate Payment array
- Client should have `historicoPagamentos` array for complete tracking

#### 5. Calculation Duplication
- Some calculations done in multiple places:
  - `calculateContractDetails` in financialMetrics.ts
  - `updateClientFinancialStatus` in financialMetrics.ts
  - Manual calculations in client creation form
- All calculations should be centralized

#### 6. Missing Required Field
- New model requires `dataInicio` but current uses `dataCadastro`
- Need to standardize on one field name

### Current Calculation Functions:

#### In financialMetrics.ts:
1. `calculateContractDetails()` - Calculates initial contract values
2. `updateClientFinancialStatus()` - Updates based on payments
3. `generateChargesForClients()` - Generates charge records
4. `carteiraTotal()` - Sum of valorTotalReceber
5. `capitalInvestido()` - Sum of valorEmprestado
6. `valorEmTransito()` - Sum of saldoDevedor for active contracts
7. `lucroEsperadoTotal()` - Sum of lucroEsperado
8. `recebidoHoje()` - Sum of payments today
9. `recebidoSemana()` - Sum of payments this week
10. `clientesAtivos()` - Count active contracts
11. `clientesAtrasados()` - Count overdue contracts
12. `clientesQuitados()` - Count completed contracts
13. `taxaAdimplencia()` - Calculate compliance rate
14. `calculateAllMetrics()` - Calculate all metrics at once
15. `getDashboardData()` - Get dashboard lists

### Dashboard Cards Current State:

#### Card 1: Carteira Total
- Formula: sum(valorTotalReceber)
- Status: ✅ Correct

#### Card 2: Capital Investido
- Formula: sum(valorEmprestado)
- Status: ✅ Correct

#### Card 3: Valor em Trânsito
- Formula: sum(saldoDevedor) for active contracts
- Status: ✅ Correct

#### Card 4: Lucro Esperado
- Formula: sum(lucroEsperado)
- Status: ✅ Correct

#### Card 5: Recebido Hoje
- Formula: sum(payments today)
- Status: ✅ Correct

#### Card 6: Recebido na Semana
- Formula: sum(payments this week)
- Status: ✅ Correct

#### Card 7: Clientes Ativos
- Formula: count active contracts
- Status: ✅ Correct

#### Card 8: Clientes Atrasados
- Formula: count overdue contracts
- Status: ✅ Correct

#### Card 9: Adimplência
- Formula: (clientesEmDia / totalClientes) * 100
- Status: ✅ Correct

#### Card 10: Contratos Quitados
- Formula: count contracts with saldoDevedor <= 0
- Status: ✅ Correct

### Client Card Display Current State:

#### Currently Displayed:
- ✅ Emprestado (valorEmprestado)
- ✅ Receber (valorTotalReceber)
- ✅ Lucro (lucroEsperado)
- ✅ Recebido (valorRecebido)
- ✅ Saldo (saldoDevedor)
- ✅ Parcelas (parcelasPagas / totalParcelas)
- ✅ Próximo vencimento (proximoVencimento)
- ✅ Status (statusContrato)

### Issues Found:

#### 1. Field Naming
- `numero` → should be `telefone`
- `dataCadastro` → should be `dataInicio`
- `tipoPagamento` → should be `frequencia`

#### 2. Optional Fields Should Be Required
- All calculated fields should be required, not optional
- This ensures data consistency

#### 3. Missing Payment History on Client
- Client should have `historicoPagamentos` array
- Each payment should record: valor, data, hora, parcelaNumero

#### 4. Migration Code
- Old `valorServico` migration code should be removed
- Migration should be one-time only

#### 5. Form Validation
- Form currently asks for: valorEmprestado, valorTotalReceber, valorParcela
- Should automatically calculate: totalParcelas, lucroEsperado, saldoDevedor
- Currently does this correctly in calculateContractDetails()

### Recommendations:

#### 1. Standardize Field Names
- `numero` → `telefone`
- `dataCadastro` → `dataInicio`
- `tipoPagamento` → `frequencia`

#### 2. Make Calculated Fields Required
- Remove optional markers from calculated fields
- Set default values where appropriate

#### 3. Add Payment History to Client
- Add `historicoPagamentos: PaymentHistoryEntry[]` to Client type
- PaymentHistoryEntry should include: valor, data, hora, parcelaNumero

#### 4. Centralize All Calculations
- Ensure all calculations go through financialMetrics.ts
- Remove any manual calculations in forms

#### 5. Update Form to Show Calculated Values
- Show calculated totalParcelas, lucroEsperado in form
- Make it clear these are auto-calculated

#### 6. Remove Migration Code
- Remove valorServico migration after confirming all data migrated

#### 7. Update All References
- Update all files that reference old field names
- Update translations if needed

### Files to Update:

1. `src/types/index.ts` - Update Client interface
2. `src/services/financialMetrics.ts` - Update calculation functions
3. `src/contexts/AppContext.tsx` - Remove migration code, update references
4. `src/app/(second)/index.tsx` - Update form field names
5. `src/components/card-client/Card-client.tsx` - Update field names
6. `src/app/(first)/index.tsx` - Update field names
7. `src/app/(third)/index.tsx` - Update field names
8. `src/i18n/translations.ts` - Update translation keys if needed

### Test Scenario: Maria

#### Input:
- Nome: Maria
- Emprestado: 1000
- Receber: 1200
- Parcela: 120
- Frequência: Mensal

#### Expected Calculations:
- Lucro Esperado: 200 (1200 - 1000)
- Total Parcelas: 10 (1200 / 120)
- Saldo Inicial: 1200
- Data Término: 10 months from start
- Próximo Vencimento: Today

#### Payment Scenarios to Test:
1. **1 Payment (120)**
   - Recebido: 120
   - Saldo: 1080
   - Parcelas Pagas: 1
   - Parcelas Restantes: 9

2. **3 Payments (360)**
   - Recebido: 360
   - Saldo: 840
   - Parcelas Pagas: 3
   - Parcelas Restantes: 7

3. **5 Payments (600)**
   - Recebido: 600
   - Saldo: 600
   - Parcelas Pagas: 5
   - Parcelas Restantes: 5

4. **10 Payments (1200)**
   - Recebido: 1200
   - Saldo: 0
   - Parcelas Pagas: 10
   - Parcelas Restantes: 0
   - Status: quitado

### Next Steps:

1. ✅ Complete audit (this report)
2. ⏳ Update Client type with new standardized fields
3. ⏳ Create centralized calculation layer
4. ⏳ Update all references to new field names
5. ⏳ Update form to show calculated values
6. ⏳ Test with Maria scenario
7. ⏳ Generate final report

