import ConstituencyData from '../ConstituencyData/ConstituencyData';

import type { ConstituencyDataProps } from '../Types/ConstituencyDataTypes';

import Data from '../lib/example_data.json';

const Constituencies = () => {
    return (
        <div>
            {Data.map(({ name, petitionList }: ConstituencyDataProps) => (
                <ConstituencyData name={name} petitionList={petitionList} />
            ))}
        </div>
    );
};

export default Constituencies;
