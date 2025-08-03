// app/materials/page.tsx
import Link from 'next/link';
import { getMaterials } from '@/app/lib/data';

export default function MaterialsPage() {
    const materials = getMaterials();
    return (
        <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px 40px' }}>
            <h1 style={{ borderBottom: '2px solid #eee', paddingBottom: 10 }}>📋 Seleção de Material</h1>
            <p>Escolha uma chapa para iniciar o plano de corte.</p>
            <div style={{ flex: 2, minWidth: 350 }}>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {materials.map(material => (
                        <li key={material.id} style={{ background: '#f9f9f9', border: '1px solid #ddd', borderRadius: 8, padding: 15, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <strong style={{ fontSize: '1.1em' }}>{material.name}</strong>
                                <p style={{ margin: '5px 0 0', color: '#555' }}>Dimensões: {material.width}mm x {material.height}mm</p>
                            </div>
                            <Link href={`/planner?materialId=${material.id}`} style={{ background: '#007bff', color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: 5, cursor: 'pointer' }}>
                                Usar Chapa →
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}