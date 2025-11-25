import {useMemo} from 'react';
import {useLocation} from 'react-router-dom';
import qs from 'query-string';

export const useQuery = () => {
    const {search} = useLocation();
    const searchObject = useMemo(
        () => qs.parse(search) as Record<string, string>,
        [search]
    );
    return searchObject;
};
