interface Petition {
    name: string;
    signatures: number;
}

export interface ConstituencyDataProps {
    name: string;
    petitionList: Petition[];
}
