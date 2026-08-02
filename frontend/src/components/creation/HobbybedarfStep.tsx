import PointDistributionStep from './PointDistributionStep'

interface HobbybedarfStepProps {
  onValid: (valid: boolean) => void
}

export default function HobbybedarfStep({ onValid }: HobbybedarfStepProps) {
  return (
    <PointDistributionStep
      stepKey="Hobbybedarf"
      onValid={onValid}
      skillPoints={5}
      skillPointLabel="Talent-Punkte"
      staerkenPoints={3}
      staerkenMaxKosten={3}
      ressourcenPoints={1}
    />
  )
}
