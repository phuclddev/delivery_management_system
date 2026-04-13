import {
  Avatar,
  Breadcrumb,
  Button,
  Layout,
  Menu,
  Space,
  Typography,
  Grid,
} from 'antd';
import {
  AlertOutlined,
  BarChartOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  LogoutOutlined,
  PieChartOutlined,
  ProjectOutlined,
  SafetyCertificateOutlined,
  ScheduleOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import type { NavigationItem } from '@/types/navigation';
import { toMenuItems } from '@/utils/menu';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const navigationItems: NavigationItem[] = [
  { key: 'dashboard', path: '/', label: 'Dashboard', icon: <DashboardOutlined /> },
  { key: 'requests', path: '/requests', label: 'Requests', icon: <FileTextOutlined /> },
  { key: 'projects', path: '/projects', label: 'Projects', icon: <ProjectOutlined /> },
  { key: 'allocations', path: '/allocations', label: 'Allocations', icon: <PieChartOutlined /> },
  { key: 'incidents', path: '/incidents', label: 'Incidents', icon: <AlertOutlined /> },
  { key: 'artifacts', path: '/artifacts', label: 'Artifacts', icon: <FolderOpenOutlined /> },
  { key: 'leaves', path: '/leaves', label: 'Leaves', icon: <ScheduleOutlined /> },
  { key: 'users', path: '/users', label: 'Users', icon: <TeamOutlined /> },
  { key: 'roles', path: '/roles', label: 'Roles', icon: <SafetyCertificateOutlined /> },
  { key: 'reports', path: '/reports', label: 'Reports', icon: <BarChartOutlined /> },
];

function getPageName(pathname: string) {
  const match = navigationItems.find((item) => item.path === pathname);
  return match?.label ?? 'Workspace';
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const { user, logout } = useAuth();
  const { hasPermission } = usePermissions();
  const currentPath = location.pathname === '' ? '/' : location.pathname;
  const canAccessReports =
    hasPermission('requests:view') ||
    hasPermission('projects:view') ||
    hasPermission('allocations:view') ||
    hasPermission('incidents:view') ||
    hasPermission('leaves:view');

  const visibleNavigationItems = navigationItems.filter((item) => {
    if (item.path === '/') {
      return true;
    }

    if (item.path === '/reports') {
      return canAccessReports;
    }

    const modulePermissionMap: Record<string, string> = {
      '/requests': 'requests:view',
      '/projects': 'projects:view',
      '/allocations': 'allocations:view',
      '/incidents': 'incidents:view',
      '/artifacts': 'artifacts:view',
      '/leaves': 'leaves:view',
      '/users': 'users:view',
      '/roles': 'roles:view',
    };

    const requiredPermission = modulePermissionMap[item.path];
    return requiredPermission ? hasPermission(requiredPermission) : true;
  });

  return (
    <Layout className="app-shell">
      <Sider
        breakpoint="lg"
        collapsedWidth={screens.md ? 84 : 0}
        width={272}
        style={{
          background:
            'linear-gradient(180deg, #062925 0%, #0b3c37 48%, #0f172a 100%)',
          boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.05)',
        }}
      >
        <div className="brand-mark">
          <div className="brand-mark__badge">
            <DatabaseOutlined />
          </div>
          <div className="brand-mark__text">
            <span className="brand-mark__title">Delivery Hub</span>
            <span className="brand-mark__subtitle">Internal operations cockpit</span>
          </div>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[currentPath]}
          items={toMenuItems(visibleNavigationItems)}
          onClick={({ key }) => navigate(key)}
          style={{
            background: 'transparent',
            borderInlineEnd: 'none',
            color: '#dff8f5',
          }}
          theme="dark"
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: 'rgba(255,255,255,0.78)',
            backdropFilter: 'blur(14px)',
            borderBottom: '1px solid rgba(148, 163, 184, 0.16)',
            padding: '0 24px',
            height: 'auto',
          }}
        >
          <Space
            style={{
              width: '100%',
              justifyContent: 'space-between',
              padding: '18px 0',
              alignItems: 'center',
            }}
          >
            <div>
              <Breadcrumb
                items={[
                  { title: 'Delivery Management' },
                  { title: getPageName(currentPath) },
                ]}
              />
              <Title level={4} style={{ margin: '8px 0 0' }}>
                {getPageName(currentPath)}
              </Title>
            </div>

            <Space size="middle">
              <Space>
                <Avatar style={{ backgroundColor: '#0f766e' }}>
                  {user?.displayName?.charAt(0) ?? 'U'}
                </Avatar>
                <div>
                  <Text strong>{user?.displayName ?? 'Unknown user'}</Text>
                  <br />
                  <Text type="secondary">
                    {user?.roles.map((role) => role.name).join(', ') || 'No role'}
                  </Text>
                </div>
              </Space>
              <Button
                type="default"
                icon={<LogoutOutlined />}
                onClick={() => {
                  logout();
                  navigate('/login', { replace: true });
                }}
              >
                Logout
              </Button>
            </Space>
          </Space>
        </Header>

        <Content className="content-wrap">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
