import type { ConstituencyDataProps } from '../Types/ConstituencyDataTypes';

const ConstituencyData = ({ name, petitionList }: ConstituencyDataProps) => {
    return (
        <>
            <div>{name}</div>
            <div>
                {petitionList.map(({ name, signatures }) => (
                    <p>
                        {name}: {signatures} signatures in this constituency.
                    </p>
                ))}
            </div>
        </>
    );
};

export default ConstituencyData;
