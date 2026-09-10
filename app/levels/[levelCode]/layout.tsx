import { notFound } from 'next/navigation';
import { parseLevelCode } from '../../../lib/curriculum.mjs';

export default async function LevelLayout({ children, params }: Readonly<{
  children: React.ReactNode;
  params: Promise<{ levelCode: string }>;
}>) {
  const { levelCode } = await params;
  if (!parseLevelCode(levelCode)) notFound();
  return children;
}

