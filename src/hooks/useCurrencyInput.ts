import { useState } from 'react';

export const useCurrencyInput = (initialValue: string = '') => {
  const [value, setValue] = useState(initialValue);

  const formatCurrency = (numericValue: number): string => {
    // Divide por 100 para tratar os últimos 2 dígitos como centavos
    const reais = Math.floor(numericValue / 100);
    const centavos = numericValue % 100;
    
    // Formata sem pontos de milhar, apenas vírgula para centavos
    return `R$ ${reais},${centavos.toString().padStart(2, '0')}`;
  };

  const handleChange = (text: string) => {
    // Remove todos os caracteres não numéricos
    const numericValue = text.replace(/\D/g, '');
    
    // Se estiver vazio, define como vazio
    if (numericValue === '') {
      setValue('');
      return;
    }

    // Converte para número
    const numberValue = parseInt(numericValue, 10);
    
    // Formata como moeda
    const formatted = formatCurrency(numberValue);
    setValue(formatted);
  };

  const getNumericValue = (): number => {
    if (!value) return 0;
    const numericValue = value.replace(/\D/g, '');
    // Divide por 100 para converter de centavos para reais
    return (parseInt(numericValue, 10) || 0) / 100;
  };

  return {
    value,
    onChangeText: handleChange,
    getNumericValue,
  };
};
