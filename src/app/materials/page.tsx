import { getMaterials } from '@/app/lib/data';
import MaterialList from './MaterialList';

export default function MaterialsPage() {
    const materials = getMaterials();

    return (
        <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
            <header style={{ textAlign: 'center', marginBottom: 40 }}>
                <h1 style={{ fontSize: '2.5rem', color: '#6d4c41', fontWeight: 700 }}>📋 Plano de Corte</h1>
                <p style={{ fontSize: '1.1rem', color: '#8d6e63' }}>Escolha uma chapa para iniciar a otimização do seu projeto.</p>
            </header>
            
            <MaterialList materials={materials} />
        </div>
    );
}