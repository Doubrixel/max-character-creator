import PointDistributionStep from './PointDistributionStep'

interface AusbildungStepProps {
  onValid: (valid: boolean) => void
}

export default function AusbildungStep({ onValid }: AusbildungStepProps) {
  return (
    <PointDistributionStep
      stepKey="ausbildung"
      onValid={onValid}
      skillPoints={30}
      skillPointLabel="Fertigkeits-Punkte"
      staerkenPoints={2}
      staerkenMaxKosten={2}
      ressourcenPoints={2}
      magicMaxPerStep={3}
      magicMaxTotal={4}
    />
  )
}
