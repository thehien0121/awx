import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';

import { t } from '@lingui/macro';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import {
  Dropdown,
  DropdownItem,
  DropdownToggle,
  DropdownPosition,
  NotificationBadge,
  NotificationBadgeVariant,
  PageHeaderTools,
  PageHeaderToolsGroup,
  PageHeaderToolsItem,
  Tooltip,
} from '@patternfly/react-core';
import { QuestionCircleIcon, UserIcon, RobotIcon } from '@patternfly/react-icons';
import { WorkflowApprovalsAPI } from 'api';
import useRequest from 'hooks/useRequest';
import getDocsBaseUrl from 'util/getDocsBaseUrl';
import { useConfig } from 'contexts/Config';
import useWsPendingApprovalCount from './useWsPendingApprovalCount';
// import { FaRegCommentDots } from 'react-icons/fa';
import Assistant from 'screens/Assistant/AssistantBox';
import { useAssistant } from 'screens/Assistant/AssistantContext';

const PendingWorkflowApprovals = styled.div`
  display: flex;
  align-items: center;
  padding: 10px;
  margin-right: 10px;
`;

function PageHeaderToolbar({
  isAboutDisabled,
  onAboutClick,
  onLogoutClick,
  loggedInUser,
}) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isUserOpen, setIsUserOpen] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const config = useConfig();
  const location = useLocation();
  const { messages, setMessages } = useAssistant();

  const { request: fetchPendingApprovalCount, result: pendingApprovals } =
    useRequest(
      useCallback(async () => {
        const {
          data: { count },
        } = await WorkflowApprovalsAPI.read({
          status: 'pending',
          page_size: 1,
        });
        return count;
      }, []),
      0
    );

  const pendingApprovalsCount = useWsPendingApprovalCount(
    pendingApprovals,
    fetchPendingApprovalCount
  );

  useEffect(() => {
    fetchPendingApprovalCount();
  }, [fetchPendingApprovalCount]);

  React.useEffect(() => {
    if (location.pathname === '/assistant' && showAssistant) {
      setShowAssistant(false);
    }
  }, [location.pathname]);

  const handleHelpSelect = () => {
    setIsHelpOpen(!isHelpOpen);
  };

  const handleUserSelect = () => {
    setIsUserOpen(!isUserOpen);
  };

  return (
    <PageHeaderTools>
      <PageHeaderToolsGroup>
        <Tooltip position="bottom" content={t`Open Assistant`}>
          <PageHeaderToolsItem>
            <span onClick={() => setShowAssistant((v) => !v)} style={{ cursor: 'pointer', marginRight: '15px', fontSize: '22px' }}>
              <RobotIcon />
            </span>
          </PageHeaderToolsItem>
        </Tooltip>
        {showAssistant && (
          <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
            <Assistant onClose={() => setShowAssistant(false)} />
          </div>
        )}
        <Tooltip position="bottom" content={t`Pending Workflow Approvals`}>
          <PageHeaderToolsItem>
            <Link to="/workflow_approvals?workflow_approvals.status=pending">
              <PendingWorkflowApprovals>
                <NotificationBadge
                  id="toolbar-workflow-approval-badge"
                  count={pendingApprovalsCount}
                  variant={
                    pendingApprovalsCount === 0
                      ? NotificationBadgeVariant.read
                      : NotificationBadgeVariant.unread
                  }
                />
              </PendingWorkflowApprovals>
            </Link>
          </PageHeaderToolsItem>
        </Tooltip>
        <PageHeaderToolsItem>
          <Dropdown
            isPlain
            isOpen={isHelpOpen}
            position={DropdownPosition.right}
            onSelect={handleHelpSelect}
            ouiaId="toolbar-info-dropdown"
            toggle={
              <DropdownToggle
                onToggle={setIsHelpOpen}
                aria-label={t`Info`}
                ouiaId="toolbar-info-dropdown-toggle"
              >
                <QuestionCircleIcon />
              </DropdownToggle>
            }
            dropdownItems={[
              <DropdownItem
                key="help"
                target="_blank"
                href={`${getDocsBaseUrl(config)}/html/userguide/index.html`}
                ouiaId="help-dropdown-item"
                rel="noopener noreferrer"
              >
                {t`Help`}
              </DropdownItem>,
              <DropdownItem
                key="about"
                component="button"
                isDisabled={isAboutDisabled}
                onClick={onAboutClick}
                ouiaId="about-dropdown-item"
              >
                {t`About`}
              </DropdownItem>,
            ]}
          />
        </PageHeaderToolsItem>
        <PageHeaderToolsItem>
          <Dropdown
            id="toolbar-user-dropdown"
            ouiaId="toolbar-user-dropdown"
            isPlain
            isOpen={isUserOpen}
            position={DropdownPosition.right}
            onSelect={handleUserSelect}
            toggle={
              <DropdownToggle
                onToggle={setIsUserOpen}
                ouiaId="toolbar-user-dropdown-toggle"
              >
                <UserIcon />
                {loggedInUser && (
                  <span style={{ marginLeft: '10px' }}>
                    {loggedInUser.username}
                  </span>
                )}
              </DropdownToggle>
            }
            dropdownItems={[
              <DropdownItem
                key="user"
                aria-label={t`User details`}
                href={
                  loggedInUser ? `#/users/${loggedInUser.id}/details` : '#/home'
                }
                ouiaId="user-dropdown-item"
              >
                {t`User Details`}
              </DropdownItem>,
              <DropdownItem
                key="logout"
                component="button"
                onClick={onLogoutClick}
                id="logout-button"
                ouiaId="logout-dropdown-item"
              >
                {t`Logout`}
              </DropdownItem>,
            ]}
          />
        </PageHeaderToolsItem>
      </PageHeaderToolsGroup>
    </PageHeaderTools>
  );
}

PageHeaderToolbar.propTypes = {
  isAboutDisabled: PropTypes.bool,
  onAboutClick: PropTypes.func.isRequired,
  onLogoutClick: PropTypes.func.isRequired,
};

PageHeaderToolbar.defaultProps = {
  isAboutDisabled: false,
};

export default PageHeaderToolbar;
