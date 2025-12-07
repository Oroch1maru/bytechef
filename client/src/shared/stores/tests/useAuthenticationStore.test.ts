import {UserI} from '@/shared/models/user.model';
import * as cookieUtils from '@/shared/util/cookie-utils';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {authenticationStore} from '../useAuthenticationStore';

const fetchMock = vi.fn();
global.fetch = fetchMock;

vi.mock('@/shared/util/cookie-utils', () => ({
    getCookie: vi.fn(),
}));

describe('useAuthenticationStore', () => {
    const initialState = authenticationStore.getState();

    beforeEach(() => {
        authenticationStore.setState(initialState, true);
        fetchMock.mockClear();
        vi.mocked(cookieUtils.getCookie).mockReturnValue('test-xsrf-token');
    });

    it('should have correct initial state', () => {
        const state = authenticationStore.getState();
        expect(state.account).toBeUndefined();
        expect(state.authenticated).toBe(false);
        expect(state.loading).toBe(false);
        expect(state.loginError).toBe(false);
        expect(state.sessionHasBeenFetched).toBe(false);
        expect(state.showLogin).toBe(false);
    });

    describe('getAccount', () => {
        it('should fetch account successfully', async () => {
            const mockUser = {activated: true, email: 'test@test.com', id: 1};
            fetchMock.mockResolvedValue({
                json: async () => mockUser,
                status: 200,
            } as Response);

            const result = await authenticationStore.getState().getAccount();

            const state = authenticationStore.getState();
            expect(fetchMock).toHaveBeenCalledWith(
                '/api/account',
                expect.objectContaining({
                    headers: expect.objectContaining({'X-XSRF-TOKEN': 'test-xsrf-token'}),
                    method: 'GET',
                })
            );
            expect(state.account).toEqual(mockUser);
            expect(state.authenticated).toBe(true);
            expect(state.loading).toBe(false);
            expect(state.sessionHasBeenFetched).toBe(true);
            expect(result).toEqual(mockUser);
        });

        it('should handle getAccount failure', async () => {
            fetchMock.mockResolvedValue({
                status: 401,
            } as Response);

            await authenticationStore.getState().getAccount();

            const state = authenticationStore.getState();
            expect(state.loading).toBe(false);
            expect(state.sessionHasBeenFetched).toBe(true);
            expect(state.showLogin).toBe(true);

            expect(state.authenticated).toBe(false);
        });

        it('should not fetch if already loading', async () => {
            authenticationStore.setState({loading: true});
            await authenticationStore.getState().getAccount();
            expect(fetchMock).not.toHaveBeenCalled();
        });
    });

    describe('login', () => {
        it('should login successfully', async () => {
            fetchMock.mockResolvedValueOnce({
                status: 200,
            } as Response);

            const mockUser = {activated: true, email: 'test@test.com', id: 1};
            fetchMock.mockResolvedValueOnce({
                json: async () => mockUser,
                status: 200,
            } as Response);

            await authenticationStore.getState().login('test@test.com', 'password', true);

            const state = authenticationStore.getState();
            expect(fetchMock).toHaveBeenNthCalledWith(
                1,
                '/api/authentication',
                expect.objectContaining({
                    body: expect.stringContaining('username=test%40test.com'),
                    method: 'POST',
                })
            );
            expect(state.loginError).toBe(false);
            expect(state.showLogin).toBe(false);
            expect(state.account).toEqual(mockUser);
        });

        it('should handle login failure', async () => {
            fetchMock.mockResolvedValue({
                status: 401,
            } as Response);

            await authenticationStore.getState().login('test@test.com', 'password', true);

            const state = authenticationStore.getState();
            expect(state.loginError).toBe(true);
            expect(state.showLogin).toBe(true);
            expect(state.authenticated).toBe(false);
        });
    });

    describe('logout', () => {
        it('should logout successfully', async () => {
            authenticationStore.setState({account: {id: 1} as UserI, authenticated: true});

            fetchMock.mockResolvedValueOnce({
                status: 200,
            } as Response);
            fetchMock.mockResolvedValueOnce({
                json: async () => ({}),
                status: 200,
            } as Response);

            await authenticationStore.getState().logout();

            const state = authenticationStore.getState();
            expect(fetchMock).toHaveBeenCalledWith('/api/logout', expect.objectContaining({method: 'POST'}));
            expect(state.showLogin).toBe(true);
            expect(state.account).toBeUndefined();
        });
    });

    describe('other actions', () => {
        it('clearAuthentication should reset auth state', () => {
            authenticationStore.setState({authenticated: true, loading: true});
            authenticationStore.getState().clearAuthentication();
            const state = authenticationStore.getState();
            expect(state.authenticated).toBe(false);
            expect(state.loading).toBe(false);
            expect(state.showLogin).toBe(true);
        });

        it('reset should reset to initial state', () => {
            authenticationStore.setState({authenticated: true, showLogin: true});
            authenticationStore.getState().reset();
            const state = authenticationStore.getState();
            expect(state.authenticated).toBe(false);
            expect(state.showLogin).toBe(false);
        });
    });
});
