"use client";

import Link from 'next/link';
import type { Material } from '@/app/lib/types';

export default function MaterialList({ materials }: { materials: Material[] }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 15 }}>
      {materials.map(material => (
        <li
          key={material.id}
          style={{
            background: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: 12,
            padding: '20px 25px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)'; }}
          onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; }}
        >
          <div>
            <strong style={{ fontSize: '1.2em', color: '#5d4037' }}>{material.name}</strong>
            <p style={{ margin: '5px 0 0', color: '#795548' }}>Dimensões: {material.width}mm x {material.height}mm</p>
          </div>
          <Link
            href={`/planner?materialId=${material.id}`}
            style={{
              background: '#8d6e63',
              color: 'white',
              textDecoration: 'none',
              padding: '10px 18px',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'background-color 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = '#a1887f'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = '#8d6e63'}
          >
            Usar Chapa →
          </Link>
        </li>
      ))}
    </ul>
  );
}