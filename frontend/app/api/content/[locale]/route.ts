import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ locale: string }> }
) {
  const { locale } = await context.params;
  // En producción esto vendría de base de datos o CMS
  // Por ahora retornamos datos mock para que el menú cargue
  const mockData = {
    locale: locale,
    menu: {
      note: "Menú actual",
      sections: [
        {
          id: "1",
          title: "Entradas",
          groups: [
            {
              id: "1",
              title: "Clásicas",
              items: [
                { name: "Bruschetta", price: 12 },
                { name: "Empanadas", price: 8 }
              ]
            }
          ]
        }
      ]
    },
    reviews: [
      { quote: "Excelente comida", author: "Cliente 1", date: "2024-01-15" },
      { quote: "Muy recomendado", author: "Cliente 2", date: "2024-02-20" }
    ],
    signature: [
      { name: "Plato especial", price: 25 }
    ],
    updatedAt: new Date().toISOString()
  };

  return NextResponse.json(mockData);
}