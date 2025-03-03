"use server"
import * as xlsx from "xlsx";
import * as fs from 'fs';
import * as path from 'path';

export const readExcel = async (): Promise<{ products: Record<string, string[]> }> => {
  const filePath = path.join(process.cwd(), "src/data/Products.xlsx");
  const fileBuffer = fs.readFileSync(filePath);

  const workbook = xlsx.read(fileBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const jsonData: any[] = xlsx.utils.sheet_to_json(sheet);

  const products: Record<string, string[]> = {};
  
  jsonData.forEach(row => {
    const grade = row.Grade as string;
    const productInfo = `${row.Model} ${row.Storage} $${row.Price}`;
    
    if (!products[grade]) {
      products[grade] = [];
    }
    products[grade].push(productInfo);
  });

  return { products };
};
