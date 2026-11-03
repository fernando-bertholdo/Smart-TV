import {act, fireEvent, render, screen} from '@testing-library/react';
import Spotlight from '@enact/spotlight';
import Search from './Search';

const mockApi = {getLibraries: jest.fn(), search: jest.fn(), searchPeople: jest.fn()};
const mockAuth = {api: mockApi, serverUrl: 'http://server', hasMultipleServers: false};
const mockSettings = {settings: {}};

jest.mock('react/jsx-dev-runtime', () => {
	const React = require('react');
	return {jsxDEV: (type, props, key, staticChildren) => {
		const config = key === undefined ? props : {...props, key};
		return staticChildren && Array.isArray(props.children)
			? React.createElement(type, config, ...props.children)
			: React.createElement(type, config);
	}};
});
jest.mock('@enact/i18n/$L', () => (text) => text);
jest.mock('@enact/spotlight', () => ({focus: jest.fn(() => true)}));
jest.mock('@enact/spotlight/Pause', () => ({isPaused: () => false}));
// Spotlight's own prop would be an unknown attribute on the plain elements these mocks render.
const plain = (type) => {
	const React = require('react');
	return ({spotlightId, ...props}) => React.createElement(type, {...props, 'data-spotlight-id': spotlightId});
};
jest.mock('@enact/spotlight/Spottable', () => (type) => plain(type));
jest.mock('@enact/spotlight/SpotlightContainerDecorator', () => (config, type) => plain(type));
jest.mock('../../context/AuthContext', () => ({useAuth: () => mockAuth}));
jest.mock('../../context/SettingsContext', () => ({useSettings: () => mockSettings}));
jest.mock('../../context/SeerrContext', () => ({useSeerr: () => ({isEnabled: false})}));
jest.mock('../../services/connectionPool', () => ({}));
jest.mock('../../services/gamesApi', () => ({}));
jest.mock('../../services/parentalControls', () => ({withoutBlockedItems: (items) => items}));
jest.mock('../../hooks/useStorage', () => () => [[], jest.fn()]);
jest.mock('../../hooks/useItemMenuHold', () => () => ({}));
jest.mock('../../components/DetailsTabBar', () => () => null);
jest.mock('../../components/LoadingSpinner', () => () => null);
jest.mock('../../components/ProxiedImage', () => () => null);
jest.mock('../../components/GameCard', () => () => null);
jest.mock('../../components/SpottableInput/SpottableInput', () => {
	const React = require('react');
	return React.forwardRef(({value, onChange}, ref) => React.createElement('input', {ref, value, onChange}));
});

const movie = {Id: 'm1', Type: 'Movie', Name: 'Alien'};

const typeQuery = async (text) => {
	fireEvent.change(screen.getByRole('textbox'), {target: {value: text}});
	await act(async () => { jest.advanceTimersByTime(450); });
};

const settle = async () => {
	await act(async () => { jest.advanceTimersByTime(150); });
};

beforeEach(() => {
	jest.useFakeTimers();
	jest.clearAllMocks();
	Spotlight.focus.mockImplementation(() => true);
	mockApi.getLibraries.mockResolvedValue([]);
	mockApi.search.mockResolvedValue({Items: [movie]});
	mockApi.searchPeople.mockResolvedValue({Items: []});
});
afterEach(() => jest.useRealTimers());

test('coming back from an opened result shows the same query and results, on the same card', async () => {
	const onSelectItem = jest.fn();
	const {unmount: leave} = render(<Search onSelectItem={onSelectItem} />);
	await typeQuery('alien');
	fireEvent.click(screen.getByText('Alien'));
	expect(onSelectItem).toHaveBeenCalledWith(movie);
	const opened = screen.getByText('Alien').closest('[data-spotlight-id]').getAttribute('data-spotlight-id');
	leave();

	mockApi.search.mockClear();
	Spotlight.focus.mockClear();
	render(<Search onSelectItem={onSelectItem} />);
	expect(screen.getByRole('textbox').value).toBe('alien');
	expect(screen.getByText('Alien')).toBeTruthy();
	await settle();
	expect(mockApi.search).not.toHaveBeenCalled();
	expect(Spotlight.focus).toHaveBeenCalledWith(opened);
	expect(Spotlight.focus).not.toHaveBeenCalledWith('search-input');
});

test('the kept search is used once, and leaving without opening a result keeps nothing', async () => {
	const {unmount: leave} = render(<Search onSelectItem={jest.fn()} />);
	await typeQuery('alien');
	fireEvent.click(screen.getByText('Alien'));
	leave();

	const {unmount: leaveAgain} = render(<Search onSelectItem={jest.fn()} />);
	await settle();
	expect(screen.getByRole('textbox').value).toBe('alien');
	leaveAgain();

	Spotlight.focus.mockClear();
	render(<Search onSelectItem={jest.fn()} />);
	await settle();
	expect(screen.getByRole('textbox').value).toBe('');
	expect(screen.queryByText('Alien')).toBeNull();
	expect(Spotlight.focus).toHaveBeenCalledWith('search-input');
});

test('when the opened card can\'t take focus, the field gets it', async () => {
	const {unmount: leave} = render(<Search onSelectItem={jest.fn()} />);
	await typeQuery('alien');
	fireEvent.click(screen.getByText('Alien'));
	leave();

	Spotlight.focus.mockClear();
	Spotlight.focus.mockImplementation((target) => target === 'search-input');
	render(<Search onSelectItem={jest.fn()} />);
	await settle();
	expect(Spotlight.focus).toHaveBeenLastCalledWith('search-input');
});
