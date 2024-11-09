import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export async function callOpenAI(input: string | File, budgets: any[]) {
  if (!openai.apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const budgetNames = budgets.map(b => ({
      name: b.name,
      id: b.id
    }));

    const currentDate = new Date().toISOString().split('T')[0];

    const systemPrompt = `You are a helpful receipt tracking AI. Your objective is to review the details provided by the user and create one or more transactions to be added to the database.

### Requirements:
- Each transaction must include:
  - Description: A clear description of the expense
  - Amount: Extract or estimate the amount as a number
  - Date: In YYYY-MM-DD format (use today's date if not specified)
  - Budget: Name of the budget category
  - BudgetID: Must match one of the provided budget IDs

### Budget Categories:
${JSON.stringify(budgetNames, null, 2)}

### Response Format:
Your response must be valid JSON with this exact structure:
{
  "transactions": [
    {
      "Description": "string",
      "Amount": number,
      "Date": "YYYY-MM-DD",
      "Budget": "string",
      "BudgetID": "string"
    }
  ]
}

### Special Notes:
- Today's date is: ${currentDate}
- Use the exact BudgetID from the provided categories
- Amounts must be numbers (not strings)
- If amount is not specified, make a reasonable estimate based on the description
- If multiple budgets could apply, choose the most appropriate one`;

    window.dispatchEvent(new CustomEvent('openai-debug', {
      detail: {
        type: 'prompt',
        data: {
          systemPrompt,
          userInput: input instanceof File ? 'Image File' : input,
          budgets: budgetNames
        }
      }
    }));

    let response;
    
    if (input instanceof File) {
      const base64Image = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(input);
      });

      response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Please analyze this receipt and extract the relevant information.' },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1024,
        response_format: { type: "json_object" }
      });
    } else {
      response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: input }
        ],
        temperature: 0.7,
        max_tokens: 1024,
        response_format: { type: "json_object" }
      });
    }

    window.dispatchEvent(new CustomEvent('openai-debug', {
      detail: {
        type: 'raw_response',
        data: response
      }
    }));

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    try {
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(content);
      } catch (parseError) {
        window.dispatchEvent(new CustomEvent('openai-debug', {
          detail: {
            type: 'parse_error',
            data: {
              error: parseError,
              content: content
            }
          }
        }));
        throw new Error('Failed to parse OpenAI response as JSON');
      }
      
      if (!parsedResponse.transactions || !Array.isArray(parsedResponse.transactions)) {
        throw new Error('Invalid response structure: missing transactions array');
      }

      for (const [index, transaction] of parsedResponse.transactions.entries()) {
        if (!transaction.Description) {
          throw new Error(`Transaction ${index}: Missing Description`);
        }
        if (typeof transaction.Amount !== 'number') {
          throw new Error(`Transaction ${index}: Amount must be a number`);
        }
        if (!transaction.Date?.match(/^\d{4}-\d{2}-\d{2}$/)) {
          throw new Error(`Transaction ${index}: Invalid Date format`);
        }
        if (!transaction.Budget) {
          throw new Error(`Transaction ${index}: Missing Budget`);
        }
        if (!transaction.BudgetID) {
          throw new Error(`Transaction ${index}: Missing BudgetID`);
        }
        if (!budgetNames.some(b => b.id === transaction.BudgetID)) {
          throw new Error(`Transaction ${index}: Invalid BudgetID`);
        }
      }

      window.dispatchEvent(new CustomEvent('openai-debug', {
        detail: {
          type: 'parsed_response',
          data: parsedResponse
        }
      }));

      return parsedResponse;
    } catch (error: any) {
      window.dispatchEvent(new CustomEvent('openai-debug', {
        detail: {
          type: 'validation_error',
          data: error.message
        }
      }));
      throw error;
    }
  } catch (error: any) {
    window.dispatchEvent(new CustomEvent('openai-debug', {
      detail: {
        type: 'error',
        data: {
          message: error.message,
          details: error
        }
      }
    }));
    throw error;
  }
}

export function isOpenAIConfigured(): boolean {
  return Boolean(import.meta.env.VITE_OPENAI_API_KEY);
}