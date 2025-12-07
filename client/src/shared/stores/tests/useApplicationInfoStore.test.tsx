import {beforeEach, describe, expect, it, vi} from 'vitest';

import {EditionType, applicationInfoStore} from '../useApplicationInfoStore';

const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('useApplicationInfoStore', () => {
    const initialState = applicationInfoStore.getState();

    beforeEach(() => {
        applicationInfoStore.setState(initialState, true);
        fetchMock.mockClear();
    });

    it('should have correct initial state', () => {
        const state = applicationInfoStore.getState();
        expect(state.loading).toBe(false);
        expect(state.ai.copilot.enabled).toBe(false);
        expect(state.analytics.enabled).toBe(false);
        expect(state.helpHub.enabled).toBe(true);
    });

    it('should fetch application info successfully and update state', async () => {
        const mockData = {
            ai: {copilot: {enabled: 'true'}},
            analytics: {enabled: 'true', postHog: {apiKey: 'test-key', host: 'test-host'}},
            application: {edition: 'EE'},
            featureFlags: {flag1: true},
            helpHub: {commandBar: {orgId: 'test-org'}, enabled: 'false'},
            signUp: {activationRequired: true, enabled: false},
            templatesSubmissionForm: {projects: 'projects-url', workflows: 'workflows-url'},
        };

        fetchMock.mockResolvedValue({
            json: async () => mockData,
            status: 200,
        } as Response);

        await applicationInfoStore.getState().getApplicationInfo();

        const state = applicationInfoStore.getState();

        expect(fetchMock).toHaveBeenCalledWith('/actuator/info', {method: 'GET'});
        expect(state.loading).toBe(false);
        expect(state.ai.copilot.enabled).toBe(true);
        expect(state.analytics.enabled).toBe(true);
        expect(state.analytics.postHog.apiKey).toBe('test-key');
        expect(state.application?.edition).toBe(EditionType.EE);
        expect(state.helpHub.enabled).toBe(false);
        expect(state.signUp.activationRequired).toBe(true);
        expect(state.templatesSubmissionForm.projects).toBe('projects-url');
        expect(state.templatesSubmissionForm.workflows).toBe('workflows-url');
    });

    it('should not fetch if already loading', async () => {
        applicationInfoStore.setState({loading: true});

        await applicationInfoStore.getState().getApplicationInfo();

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should handle non-200 response (bug: loading remains true)', async () => {
        fetchMock.mockResolvedValue({
            status: 500,
        } as Response);

        await applicationInfoStore.getState().getApplicationInfo();

        const state = applicationInfoStore.getState();
        expect(state.loading).toBe(true);
    });
});
