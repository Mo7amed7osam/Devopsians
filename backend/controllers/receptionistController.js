export const reserveICU = (req, res) => {
    // Logic to reserve an ICU
    res.status(201).send({ message: "ICU reserved successfully." });
};

export const calculateFee = (req, res) => {
    // Logic to calculate fee
    res.status(200).send({ fee: 0 });
};
