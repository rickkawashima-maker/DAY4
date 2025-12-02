function doPost(e) {
  // CORS header for cross-origin requests
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  try {
    // Parse the incoming JSON data
    const postData = JSON.parse(e.postData.contents);
    const expenses = postData.expenses;

    if (!Array.isArray(expenses)) {
      throw new Error('Invalid data format: expenses must be an array');
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getActiveSheet(); // Or getSheetByName('Sheet1')

    // Initialize headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['ID', 'Date', 'Category', 'Amount', 'Memo', 'Updated At']);
    }

    // Get existing IDs to avoid duplicates (simple upsert logic)
    const existingIds = getExistingIds(sheet);
    const newRows = [];
    const updates = []; // For future use if we want to update existing rows

    expenses.forEach(expense => {
      if (!existingIds.has(String(expense.id))) {
        newRows.push([
          String(expense.id),
          expense.date,
          expense.category,
          expense.amount,
          expense.memo,
          new Date()
        ]);
      } else {
        // Optional: Update existing row logic here
        // For now, we just skip existing IDs to prevent duplicates
      }
    });

    if (newRows.length > 0) {
      // Batch append for performance
      sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
    }

    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'success', 
      message: `Synced ${newRows.length} new records`,
      added: newRows.length
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders(headers);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'error', 
      message: error.toString() 
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders(headers);
  }
}

function getExistingIds(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return new Set();
  
  // Assuming ID is in column A (index 1)
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  return new Set(ids.flat().map(String));
}

function doOptions(e) {
  // Handle preflight requests for CORS
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
}
