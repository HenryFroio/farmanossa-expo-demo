// src/utils/dateFormatter.ts
// Função para formatar data e hora no formato brasileiro
export const formatBrazilianDateTime = (date: Date | string | any) => {
  let dateObj: Date;
  
  // Se o date for um timestamp do Firebase
  if (date && typeof date === 'object' && date.toDate) {
    dateObj = date.toDate();
  } else if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = new Date();
  }

  // Formatar data no formato brasileiro com fuso horário de Brasília
  const formattedDate = dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo'
  });

  // Formatar hora no fuso horário de Brasília
  const formattedTime = dateObj.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });

  return `${formattedDate} às ${formattedTime}`;
};

// Exemplo de uso:
// Para um timestamp do Firebase: 15 de junho de 2025 às 19:08:17 UTC-3
// Resultado: "15/06/2025 às 19:08"
