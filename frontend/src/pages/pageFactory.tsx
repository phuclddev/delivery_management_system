import { PagePlaceholder } from '@/components/PagePlaceholder';
import { usePageTitle } from '@/hooks/use-page-title';

interface PlaceholderPageOptions {
  eyebrow: string;
  title: string;
  description: string;
  metrics: Array<{ label: string; value: string }>;
  items: Array<{ title: string; meta: string; value: string }>;
}

export function createPlaceholderPage(options: PlaceholderPageOptions) {
  function PlaceholderPage() {
    usePageTitle(options.title);

    return (
      <PagePlaceholder
        eyebrow={options.eyebrow}
        title={options.title}
        description={options.description}
        metrics={options.metrics}
        items={options.items}
      />
    );
  }

  return PlaceholderPage;
}

