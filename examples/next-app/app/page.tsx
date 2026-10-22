'use client';

import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  DesignSystemProvider,
  Dialog,
  layout,
  text,
  Link,
  RadioGroup,
  Select,
  Switch,
  Tabs,
  TextAreaField,
  TextField,
} from '@examples/react-design-system';
import { site } from '@/styles/site';
import { tokens } from '@examples/design-system';

const sunsetTheme = tokens.createTheme({
  name: 'ds-sunset',
  tokens: {
    color: {
      accent: '#ea580c',
      accentHover: '#c2410c',
      accentForeground: '#fff7ed',
      focusRing: '#fb923c',
    },
  },
});

type ThemeMode = 'light' | 'dark' | 'sunset';

export default function Home(): JSX.Element {
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [accepted, setAccepted] = useState(true);
  const [autoDeploy, setAutoDeploy] = useState(false);
  const [framework, setFramework] = useState('next');
  const [teamRole, setTeamRole] = useState('frontend');
  const [tabId, setTabId] = useState('consume');

  const tabs = useMemo(
    () => [
      {
        id: 'consume',
        label: 'Consume',
        content: 'Apps import one package and use the same accessible components.',
      },
      {
        id: 'tokens',
        label: 'Token API',
        content: 'Token references stay stable while themes only override CSS vars.',
      },
      {
        id: 'theme',
        label: 'Theme API',
        content: 'tokens.createTheme enables per-app brand theming with partial overrides.',
      },
    ],
    [],
  );

  const customThemeClassName = themeMode === 'sunset' ? sunsetTheme.className : undefined;
  const providerTheme = themeMode === 'dark' ? 'dark' : 'light';

  return (
    <DesignSystemProvider theme={providerTheme} customThemeClassName={customThemeClassName}>
      <main className={`${site.page} ${layout.stack}`}>
        <header className={`${site.header} ${layout.stack}`}>
          <h1 className={text.title}>Next.js consuming shared typestyles design system</h1>
          <p className={text.subtitle}>
            This example consumes the same React library as Vite and applies app-level custom
            theming.
          </p>
          <div className={layout.row}>
            <Button
              intent={themeMode === 'light' ? 'primary' : 'secondary'}
              onPress={() => setThemeMode('light')}
            >
              Light
            </Button>
            <Button
              intent={themeMode === 'dark' ? 'primary' : 'secondary'}
              onPress={() => setThemeMode('dark')}
            >
              Dark
            </Button>
            <Button
              intent={themeMode === 'sunset' ? 'primary' : 'secondary'}
              onPress={() => setThemeMode('sunset')}
            >
              Sunset (custom)
            </Button>
          </div>
        </header>

        <section className={layout.section}>
          <h2 className={text.sectionTitle}>10 Common Components</h2>
          <div className={layout.row}>
            <Button intent="primary">Button</Button>
            <Link href="https://react-spectrum.adobe.com/react-aria/">Link</Link>
            <Dialog
              triggerLabel="Dialog"
              title="Shared, themed modal"
              description="Underlying accessibility behavior comes from react-aria-components."
            />
          </div>
          <div className={layout.row}>
            <TextField
              label="Repository name"
              placeholder="design-system"
              description="TextField and Input are wrapped by the shared library."
            />
            <Select
              label="Framework"
              selectedKey={framework}
              onSelectionChange={(key) => setFramework(String(key))}
              options={[
                { id: 'next', label: 'Next.js' },
                { id: 'vite', label: 'Vite' },
                { id: 'remix', label: 'Remix' },
              ]}
            />
          </div>
          <TextAreaField
            label="Theme notes"
            placeholder="Document brand token overrides..."
            description="Token customization still uses typestyles vars under the hood."
          />
          <div className={layout.row}>
            <Checkbox isSelected={accepted} onChange={setAccepted}>
              Checkbox
            </Checkbox>
            <Switch isSelected={autoDeploy} onChange={setAutoDeploy}>
              Switch
            </Switch>
          </div>
          <RadioGroup
            label="Role"
            value={teamRole}
            onChange={setTeamRole}
            options={[
              { value: 'frontend', label: 'Frontend Engineer' },
              { value: 'design', label: 'Product Designer' },
              { value: 'platform', label: 'Platform Engineer' },
            ]}
          />
          <Tabs
            tabs={tabs}
            selectedKey={tabId}
            onSelectionChange={(key) => setTabId(String(key))}
          />
        </section>
      </main>
    </DesignSystemProvider>
  );
}
