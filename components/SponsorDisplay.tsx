
import React from 'react';
import { Sponsor } from '../types';

interface SponsorDisplayProps {
    sponsor: Sponsor;
}

const SponsorDisplay: React.FC<SponsorDisplayProps> = ({ sponsor }) => {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8">
            <img src={sponsor.logo} alt="Sponsor" className="max-w-full max-h-[90%] object-contain" />
        </div>
    );
};

export default SponsorDisplay;
