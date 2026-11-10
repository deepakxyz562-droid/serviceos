export function createURL(path: string): string {
  const clean = path.replace(/^\/+/, '');
  return `bgos://${clean}`;
}

export async function openURL(): Promise<void> {}

export async function canOpenURL(): Promise<boolean> {
  return true;
}

const expoLinkingMock = {
  createURL,
  openURL,
  canOpenURL,
};

export default expoLinkingMock;
